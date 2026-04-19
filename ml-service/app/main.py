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

import aiofiles

from .worker import generate_image_task, celery_app

app = FastAPI(title="Decoraid ML Service")
app.mount("/results", StaticFiles(directory="/app/results"), name="results")

# ML Pipeline moved to worker.py to save VRAM and execution limits

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
        # --- Step 1: Decode image and save payload asynchronously ---
        task_id = str(uuid.uuid4())
        input_path = f"/app/results/{task_id}_input.jpg"

        image_bytes = await image.read()
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Offload file I/O to thread
        await asyncio.to_thread(pil_image.save, input_path, format="JPEG")

        # --- Step 2: Dispatch async task entirely out of FastAPI ---
        task = generate_image_task.apply_async(
            args=[input_path, style], 
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
            # Offload OS operations
            file_exists = await asyncio.to_thread(os.path.exists, meta_path)
            if file_exists:
                async with aiofiles.open(meta_path, mode="r") as f:
                    content = await f.read()
                    meta_data = json.loads(content)
            
            return {
                "status": "completed",
                "result_url": f"/api/results/{task_id}.jpg",
                **meta_data
            }
        else:
            return {"status": "failed", "error": str(res.result)}
            
    return {"status": "processing"}