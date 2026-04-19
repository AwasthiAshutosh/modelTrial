import io
import os
import json
import uuid
import asyncio
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from celery.result import AsyncResult
from PIL import Image

from .services.detector import ObjectDetector
from .services.prompter import PromptEngine
from .services.classifier import StyleClassifier
from .worker import generate_image_task, celery_app

app = FastAPI(title="Decoraid ML Service")
app.mount("/results", StaticFiles(directory="/app/results"), name="results")

# ---------------------------------------------------------------------------
# Initialize all models once at startup — NOT per-request.
# On first boot, this will download model weights from HuggingFace (~5GB).
# Subsequent runs use the local cache at ~/.cache/huggingface.
# ---------------------------------------------------------------------------
detector = ObjectDetector()
prompter = PromptEngine()
classifier = StyleClassifier()

os.makedirs("/app/results", exist_ok=True)


@app.get("/health")
async def health():
    """Health check endpoint used by Docker Compose and load balancers."""
    return {"status": "healthy"}


@app.post("/generate")
async def generate_design(
    image: UploadFile = File(...),
    style: str = Form(...)
):
    """
    Main generation pipeline:
    1. Read and decode the uploaded room image.
    2. Detect furniture/objects via YOLOv8n.
    3. (Optional) If style == "auto", classify the room style from our trained model.
    4. Build a conditioning prompt.
    5. Generate redesigned image via Stable Diffusion + ControlNet.
    6. Return base64-encoded image + metadata as JSON.
    """
    try:
        # --- Step 1: Decode image ---
        image_bytes = await image.read()
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # --- Step 2: Object Detection (Threaded) ---
        detected_objects = await asyncio.to_thread(detector.detect, pil_image)

        # --- Step 3: Style Classification (Threaded) ---
        style_predictions = await asyncio.to_thread(classifier.classify, pil_image)
        active_style = style_predictions[0]["style"] if style == "auto" else style

        # --- Step 4: Prompt Construction ---
        prompt = prompter.build_prompt(detected_objects, active_style)

        # --- Step 5: Save input and dispatch to Celery ---
        task_id = str(uuid.uuid4())
        input_path = f"/app/results/{task_id}_input.jpg"
        pil_image.save(input_path, format="JPEG")
        
        # Save metadata synchronously for the status poll
        meta_path = f"/app/results/{task_id}_meta.json"
        with open(meta_path, "w") as f:
            json.dump({
                "detected_objects": detected_objects,
                "style_predictions": style_predictions,
                "metadata": {"prompt": prompt, "style": active_style}
            }, f)

        # Dispatch async task
        task = generate_image_task.apply_async(
            args=[input_path, prompt, active_style], 
            task_id=task_id
        )

        return {"status": "processing", "task_id": task.id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML Pipeline Error: {str(e)}")


@app.get("/status/{task_id}")
async def get_status(task_id: str):
    res = AsyncResult(task_id, app=celery_app)
    
    if res.ready():
        if res.successful():
            meta_path = f"/app/results/{task_id}_meta.json"
            meta_data = {}
            if os.path.exists(meta_path):
                with open(meta_path, "r") as f:
                    meta_data = json.load(f)
            
            return {
                "status": "completed",
                "result_url": f"/api/results/{task_id}.jpg",
                **meta_data
            }
        else:
            return {"status": "failed", "error": str(res.result)}
            
    return {"status": "processing"}