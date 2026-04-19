import io
import json
import uuid
import base64
import asyncio
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, StreamingResponse
from celery.result import AsyncResult
from PIL import Image

from .worker import generate_image_task, celery_app

app = FastAPI(title="Decoraid ML Service")

# ML Pipeline moved to worker.py to save VRAM and execution limits



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
        # --- Step 1: Decode and compress image to base64 payload ---
        task_id = str(uuid.uuid4())

        image_bytes = await image.read()
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        buf = io.BytesIO()
        pil_image.save(buf, format="JPEG", quality=85)
        input_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')

        # --- Step 2: Dispatch async task entirely out of FastAPI ---
        task = generate_image_task.apply_async(
            args=[input_b64, style], 
            task_id=task_id
        )

        return {"status": "processing", "task_id": task.id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML Pipeline Error: {str(e)}")


@app.get("/status/{task_id}")
async def get_status(task_id: str):
    async def event_generator():
        while True:
            res = AsyncResult(task_id, app=celery_app)
            if res.ready():
                if res.successful():
                    result_data = res.result
                    data = {
                        "status": "completed",
                        "result_url": f"data:image/jpeg;base64,{result_data.get('result_b64', '')}",
                        "detected_objects": result_data.get("detected_objects", []),
                        "style_predictions": result_data.get("style_predictions", []),
                        "metadata": result_data.get("metadata", {})
                    }
                    yield f"data: {json.dumps(data)}\n\n"
                    break
                else:
                    data = {"status": "failed", "error": str(res.result)}
                    yield f"data: {json.dumps(data)}\n\n"
                    break
            else:
                data = {"status": "processing"}
                yield f"data: {json.dumps(data)}\n\n"
                await asyncio.sleep(0.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")