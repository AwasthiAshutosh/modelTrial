import os
import io
import base64
import json
import gc
import torch
from PIL import Image
from celery import Celery
from celery.signals import worker_process_init

# Import your services
from .services.detector import ObjectDetector
from .services.classifier import StyleClassifier
from .services.prompter import PromptEngine
from .services.generator import ImageGenerator

celery_app = Celery(
    "decoraid_ml_worker", 
    broker="redis://redis:6379/0", 
    backend="redis://redis:6379/0"
)

# Global instances
ml_components = {}

@worker_process_init.connect
def init_worker(**kwargs):
    print("Booting models during worker startup...")
    ml_components['detector'] = ObjectDetector()
    ml_components['classifier'] = StyleClassifier()
    ml_components['prompter'] = PromptEngine()
    ml_components['generator'] = ImageGenerator()

# Use bind=True to safely get self.request.id
@celery_app.task(bind=True, name="generate_image_task")
def generate_image_task(self, input_image_b64: str, raw_selected_style: str):
    """
    Heavy GPU task linearly executing YOLO, Classifier, Prompter and Stable Diffusion.
    Models are loaded during Celery worker initialization.
    """
    try:
        task_id = self.request.id  # Safe task ID retrieval
        
        image_bytes = base64.b64decode(input_image_b64)
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        detected_objects = ml_components['detector'].detect(pil_image)
        style_predictions = ml_components['classifier'].classify(pil_image)
        active_style = style_predictions[0]["style"] if raw_selected_style == "auto" else raw_selected_style
        prompt = ml_components['prompter'].build_prompt(detected_objects, active_style)
        
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
            
        generated_image = ml_components['generator'].generate(pil_image, prompt, active_style)
        
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
        
        # Compress and base64 encode result
        buf = io.BytesIO()
        generated_image.save(buf, format="JPEG", quality=90)
        result_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        
        return {
            "status": "success", 
            "result_b64": result_b64,
            "detected_objects": detected_objects,
            "style_predictions": style_predictions,
            "metadata": {"prompt": prompt, "style": active_style}
        }
    except Exception as e:
        print(f"[Celery Worker] Task failed: {str(e)}")
        raise e
