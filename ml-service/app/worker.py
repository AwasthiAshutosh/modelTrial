import os
import io
from PIL import Image
from celery import Celery
from .services.generator import ImageGenerator

# Initialize Celery explicitly pointing to our Redis container
celery_app = Celery(
    "decoraid_ml_worker", 
    broker="redis://redis:6379/0", 
    backend="redis://redis:6379/0"
)

# Initialize generator once when the worker spawns to hold it in VRAM
print("[Celery Worker] Booting Stable Diffusion Engine into VRAM...")
generator = ImageGenerator()

# Ensure shared volume directory exists
os.makedirs("/app/results", exist_ok=True)

@celery_app.task(name="generate_image_task")
def generate_image_task(input_image_path: str, prompt: str, style: str):
    """
    Heavy GPU task offloaded from the FastAPI server.
    Loads the uploaded image from the shared volume, generates the new design,
    and returns its location.
    """
    try:
        pil_image = Image.open(input_image_path).convert("RGB")
        
        # Generation step (takes 5-20 seconds on GPU)
        generated_image = generator.generate(pil_image, prompt, style)
        
        from celery import current_task
        task_id = current_task.request.id
        
        output_path = f"/app/results/{task_id}.jpg"
        generated_image.save(output_path, format="JPEG", quality=90)
        
        # Clean up the input image to save disk space
        if os.path.exists(input_image_path):
            os.remove(input_image_path)
            
        return {"status": "success", "file": output_path}
    except Exception as e:
        print(f"[Celery Worker] Task failed: {str(e)}")
        raise e
