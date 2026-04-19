import os
from ultralytics import YOLO
from PIL import Image

# Path to the trained classifier weights downloaded from Kaggle notebook.
# After running the notebook, download best.pt and place it here:
#   ml-service/app/models/style_classifier.pt
_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "style_classifier.pt")
_FALLBACK_PATH = "yolov8s-cls.pt"  # Pre-trained fallback if custom model not present


class StyleClassifier:
    """
    Classifies the interior design style of a room image using the YOLOv8s-cls
    model trained on the Kaggle 'Interior Design Styles' dataset (19 classes).

    Training was done in:  notebook/notebookc937c820ab.ipynb
    Dataset:               stepanyarullin/interior-design-styles (Kaggle)
    Best validation acc:   Top-1 ~37%, Top-5 ~77% (19 classes, ~18k images)

    The trained model weight file should be saved at:
        ml-service/app/models/style_classifier.pt
    If it is not found, the service falls back to the generic pre-trained weights.
    """

    def __init__(self):
        model_path = _MODEL_PATH if os.path.exists(_MODEL_PATH) else _FALLBACK_PATH
        if model_path == _FALLBACK_PATH:
            print(
                "[StyleClassifier] WARNING: Custom weights not found at "
                f"'{_MODEL_PATH}'. Falling back to '{_FALLBACK_PATH}'. "
                "Download best.pt from the Kaggle notebook and place it at "
                "ml-service/app/models/style_classifier.pt for accurate results."
            )
        self.model = YOLO(model_path)
        print(f"[StyleClassifier] Loaded from: {model_path}")

    def classify(self, image: Image.Image) -> list[dict]:
        """
        Runs classification inference on a PIL Image.

        Returns:
            A list of the top-3 predicted styles, each as:
            {"style": str, "confidence": float}

        Example output:
            [
                {"style": "modern", "confidence": 0.42},
                {"style": "contemporary", "confidence": 0.21},
                {"style": "mid-century-modern", "confidence": 0.11}
            ]
        """
        if not os.path.exists(_MODEL_PATH):
            print("[StyleClassifier] Custom model missing. Returning default style.")
            return [{"style": "modern", "confidence": 1.0}]

        results = self.model(image, device="cpu")
        probs = results[0].probs
        names = results[0].names

        top3_indices = probs.top5[:3]
        top3_conf = probs.top5conf[:3].tolist()

        return [
            {"style": names[int(idx)], "confidence": round(conf, 4)}
            for idx, conf in zip(top3_indices, top3_conf)
        ]
