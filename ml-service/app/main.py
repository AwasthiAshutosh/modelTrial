import io
import base64
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from PIL import Image

from .services.detector import ObjectDetector
from .services.generator import ImageGenerator
from .services.prompter import PromptEngine
from .services.classifier import StyleClassifier

app = FastAPI(title="Decoraid ML Service")

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

        # --- Step 5: Generate redesigned image ---
        generated_image = generator.generate(pil_image, prompt)

        # --- Step 6: Encode and return ---
        img_byte_arr = io.BytesIO()
        generated_image.save(img_byte_arr, format="JPEG", quality=90)
        img_b64 = base64.b64encode(img_byte_arr.getvalue()).decode("utf-8")

        return {
            "generated_image": img_b64,
            "detected_objects": detected_objects,       # list[str]
            "style_predictions": style_predictions,     # list[{style, confidence}]
            "metadata": {
                "prompt": prompt,
                "style": active_style,
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML Pipeline Error: {str(e)}")