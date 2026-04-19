import io
import base64
import json
import asyncio
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from PIL import Image

from .services.detector import ObjectDetector
from .services.generator import ImageGenerator
from .services.prompter import PromptEngine
from .services.classifier import StyleClassifier

app = FastAPI(title="Decoraid ML Service")
gpu_lock = asyncio.Lock()

# ---------------------------------------------------------------------------
# Initialize all models once at startup — NOT per-request.
# On first boot, this will download model weights from HuggingFace (~5GB).
# Subsequent runs use the local cache at ~/.cache/huggingface.
# ---------------------------------------------------------------------------
detector = ObjectDetector()
generator = ImageGenerator()
prompter = PromptEngine()
classifier = StyleClassifier()


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

        # --- Step 2: Object Detection ---
        detected_objects = detector.detect(pil_image)

        # --- Step 3: Style Classification ---
        # If the frontend passes style="auto", we auto-detect from the image.
        # Otherwise we use the user-selected style directly.
        style_predictions = classifier.classify(pil_image)
        active_style = style_predictions[0]["style"] if style == "auto" else style

        # --- Step 4: Prompt Construction ---
        prompt = prompter.build_prompt(detected_objects, active_style)

        # --- Step 5: Generate redesigned image locked via GPU lock ---
        async with gpu_lock:
            generated_image = await asyncio.to_thread(
                generator.generate, pil_image, prompt, active_style
            )

        # --- Step 6: Encode into raw binary response ---
        img_byte_arr = io.BytesIO()
        generated_image.save(img_byte_arr, format="JPEG", quality=90)

        metadata = {
            "detected_objects": detected_objects,       # list[str]
            "style_predictions": style_predictions,     # list[{style, confidence}]
            "metadata": {
                "prompt": prompt,
                "style": active_style,
            },
        }

        return Response(
            content=img_byte_arr.getvalue(),
            media_type="image/jpeg",
            headers={"X-Image-Metadata": json.dumps(metadata)}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML Pipeline Error: {str(e)}")