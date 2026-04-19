import os
from ultralytics import YOLO
from PIL import Image

# Resolve the absolute path to yolov8n.pt shipped alongside the Docker image.
# Using a bare filename relies on CWD being /app — if Celery prefork changes CWD,
# Ultralytics silently re-downloads the model from the internet on every restart.
_DEFAULT_YOLO_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "yolov8n.pt"
)


class ObjectDetector:
    """
    Detects furniture and room objects in a PIL Image using YOLOv8n.

    Uses the standard COCO-pretrained YOLOv8 nano model — no custom training
    needed here because COCO already covers the furniture classes relevant to
    interior design (sofa, chair, dining table, bed, lamp, tv, book, etc.).

    For higher accuracy on interior-specific objects, replace 'yolov8n.pt'
    with a fine-tuned weight trained on a dataset like ADE20K or COCO-Stuff,
    using the scripts in ml/training/train_detection.py.
    """

    # Subset of COCO class names that are relevant to interior design.
    # Detections outside this set are filtered out to keep prompts clean.
    INTERIOR_CLASSES = {
        "chair", "couch", "bed", "dining table", "toilet", "tv",
        "laptop", "microwave", "oven", "refrigerator", "sink",
        "book", "clock", "vase", "scissors", "teddy bear",
        "potted plant", "bottle", "cup", "bowl", "wine glass",
    }

    def __init__(self, model_path: str = _DEFAULT_YOLO_PATH):
        self.model = YOLO(model_path)
        print(f"[ObjectDetector] Loaded '{model_path}' on COCO weights.")

    def detect(self, image: Image.Image) -> list[str]:
        """
        Runs YOLOv8 inference on a PIL Image and returns unique interior-relevant
        class labels found in the scene.

        Args:
            image: A PIL Image (RGB).

        Returns:
            A deduplicated list of object label strings, e.g. ["couch", "chair", "tv"].
            Returns an empty list if nothing is detected.
        """
        results = self.model(image, device="cpu", verbose=False)
        detected = set()

        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                class_name = self.model.names[class_id]
                # Only include labels relevant to interior spaces
                if class_name in self.INTERIOR_CLASSES:
                    detected.add(class_name)

        return sorted(detected)   # sorted for deterministic prompt ordering