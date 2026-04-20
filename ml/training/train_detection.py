from ultralytics import YOLO
import os
import torch

def train_detection(config_path='data/detection/data.yaml', epochs=50, imgsz=640):
    """
    Fine-tune YOLOv8 on a custom interior design dataset.
    """
    print(f"Starting YOLOv8 training with {config_path}...")
    
    # Load a pretrained model
    model = YOLO('yolov8n.pt')
    
    # Train the model
    results = model.train(
        data=config_path, 
        epochs=epochs, 
        imgsz=imgsz,
        device=0 if torch.cuda.is_available() else 'cpu', # Dynamic GPU/CPU
        project='runs/detect',
        name='interior_redesign'
    )
    
    print(f"Training complete. Weights saved to {results.save_dir}")
    return results.save_dir

if __name__ == "__main__":
    # Ensure data path exists
    if os.path.exists('data/detection/data.yaml'):
        train_detection()
    else:
        print("Error: data/detection/data.yaml not found. Run prepare_data.py first.")
