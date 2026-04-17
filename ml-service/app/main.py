import os
import base64
from io import BytesIO
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import uvicorn
from dotenv import load_dotenv

from app.services.detector import RoomDetector
from app.services.generator import RoomGenerator
from app.services.prompter import PromptEngine

load_dotenv()

app = FastAPI(title="Interior Design AI ML Service")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global models (Lazy loaded)
detector = None
generator = None
prompter = PromptEngine()

def get_detector():
    global detector
    if detector is None:
        detector = RoomDetector()
    return detector

def get_generator():
    global generator
    if generator is None:
        generator = RoomGenerator()
    return generator

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/models-info")
async def models_info():
    return {
        "detection_model": "YOLOv8n",
        "generation_model": "Stable Diffusion v1.5 + ControlNet Canny",
        "device": "cuda" if os.environ.get("CUDA_VISIBLE_DEVICES") else "cpu"
    }

@app.post("/generate")
async def generate_redesign(
    file: UploadFile = File(...),
    style: str = Form("modern")
):
    try:
        # Load and validate image
        contents = await file.read()
        image = Image.open(BytesIO(contents)).convert("RGB")
        
        # 1. Detect objects
        det_service = get_detector()
        detections = det_service.detect(image)
        scene_data = det_service.get_structured_scene(detections, image.width, image.height)
        
        # 2. Generate prompt
        prompt, neg_prompt = prompter.generate_prompt(style, scene_data)
        
        # 3. Generate redesigned image
        gen_service = get_generator()
        result_image = gen_service.generate(image, prompt, neg_prompt)
        
        # Convert result to base64
        buffered = BytesIO()
        result_image.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return {
            "generated_image": img_str,
            "detected_objects": scene_data,
            "metadata": {
                "prompt": prompt,
                "style": style
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
