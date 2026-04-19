import os
import io
import json
import torch
from PIL import Image
from celery import Celery

from .services.detector import ObjectDetector
from .services.classifier import StyleClassifier
from .services.prompter import PromptEngine
from .services.generator import ImageGenerator

# Initialize Celery explicitly pointing to our Redis container
celery_app = Celery(
    "decoraid_ml_worker", 
    broker="redis://redis:6379/0", 
    backend="redis://redis:6379/0"
)

# Initialize all ML models linearly in the worker
print("[Celery Worker] Booting Full ML Pipeline into VRAM...")
detector = ObjectDetector()
classifier = StyleClassifier()
prompter = PromptEngine()
generator = ImageGenerator()

# Ensure shared volume directory exists
os.makedirs("/app/results", exist_ok=True)

@celery_app.task(name="generate_image_task")
def generate_image_task(input_image_path: str, raw_selected_style: str):
    """
    Heavy GPU task linearly executing YOLO, Classifier, Prompter and Stable Diffusion.
    """
    try:
        from celery import current_task
        task_id = current_task.request.id

        pil_image = Image.open(input_image_path).convert("RGB")
        
        # Linear memory optimization
        detected_objects = detector.detect(pil_image)
        style_predictions = classifier.classify(pil_image)
        active_style = style_predictions[0]["style"] if raw_selected_style == "auto" else raw_selected_style
        prompt = prompter.build_prompt(detected_objects, active_style)
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            
        generated_image = generator.generate(pil_image, prompt, active_style)
        
        output_path = f"/app/results/{task_id}.jpg"
        generated_image.save(output_path, format="JPEG", quality=90)
        
        # Write metadata for the status polling
        meta_path = f"/app/results/{task_id}_meta.json"
        with open(meta_path, "w") as f:
            json.dump({
                "detected_objects": detected_objects,
                "style_predictions": style_predictions,
                "metadata": {"prompt": prompt, "style": active_style}
            }, f)
            
        return {"status": "success", "file": output_path}
    except Exception as e:
        print(f"[Celery Worker] Task failed: {str(e)}")
        raise e
    finally:
        if os.path.exists(input_image_path):
            os.remove(input_image_path)
