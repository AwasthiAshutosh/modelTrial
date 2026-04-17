import cv2
import numpy as np
from ultralytics import YOLO
import torch

class RoomDetector:
    def __init__(self, model_path='yolov8n.pt', custom_weights=None):
        # Load the YOLOv8 model (Nano for speed, can be upgraded to 'm' or 'l')
        path = custom_weights if custom_weights else model_path
        self.model = YOLO(path)
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
    def detect(self, image_path):
        results = self.model.predict(image_path, device=self.device)
        detections = []
        
        # YOLOv8 returns a list of Results objects
        for result in results:
            boxes = result.boxes
            for box in boxes:
                detections.append({
                    "label": self.model.names[int(box.cls)],
                    "confidence": float(box.conf),
                    "bbox": [float(x) for x in box.xyxy[0].tolist()],  # [x1, y1, x2, y2]
                })
        
        return detections

    def get_structured_scene(self, detections, img_width, img_height):
        objects_summary = {}
        spatial_representation = []
        
        for det in detections:
            label = det['label']
            objects_summary[label] = objects_summary.get(label, 0) + 1
            
            # Simple spatial logic
            bbox = det['bbox']
            center_x = (bbox[0] + bbox[2]) / 2
            
            if center_x < img_width / 3:
                pos = "left"
            elif center_x > 2 * img_width / 3:
                pos = "right"
            else:
                pos = "center"
                
            spatial_representation.append({
                "object": label,
                "position": pos
            })
            
        return {
            "objects": [{"label": k, "count": v} for k, v in objects_summary.items()],
            "spatial": spatial_representation
        }
