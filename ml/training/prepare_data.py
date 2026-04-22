import os
import requests
import zipfile
from tqdm import tqdm

def download_file(url, filename):
    response = requests.get(url, stream=True)
    response.raise_for_status()
    total_size = int(response.headers.get('content-length', 0))
    block_size = 1024
    t = tqdm(total=total_size, unit='iB', unit_scale=True)
    with open(filename, 'wb') as f:
        for data in response.iter_content(block_size):
            t.update(len(data))
            f.write(data)
    t.close()

def setup_detection_data():
    """
    Setup a sample dataset for YOLOv8 training.
    In a real scenario, this would download a large dataset like ADE20K or COCO.
    For this demo, we'll create the structure and provide links.
    """
    print("Setting up Detection Data structure...")
    dirs = ['data/detection/images/train', 'data/detection/images/val', 
            'data/detection/labels/train', 'data/detection/labels/val']
    for d in dirs:
        os.makedirs(d, exist_ok=True)
        
    # Create the data.yaml for YOLOv8
    yaml_content = f"""
path: ../data/detection
train: images/train
val: images/val

names:
  0: sofa
  1: chair
  2: table
  3: bed
  4: lamp
"""
    with open('data/detection/data.yaml', 'w') as f:
        f.write(yaml_content)
    print("Created data.yaml for YOLOv8")

def setup_generation_data():
    """
    Setup data for SD LoRA training.
    Requires folders of images with captions in .txt files.
    """
    print("Setting up Generation Data structure...")
    styles = ['scandinavian', 'boho', 'modern', 'industrial']
    for style in styles:
        os.makedirs(f'data/generation/{style}', exist_ok=True)
    
    print("Structure ready. To train, place images in data/generation/[style] and create .txt files with captions.")

if __name__ == "__main__":
    os.makedirs('data', exist_ok=True)
    setup_detection_data()
    setup_generation_data()
