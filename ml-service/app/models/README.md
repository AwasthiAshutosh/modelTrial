# Place your trained model weights here.
#
# STEP-BY-STEP to get the trained model:
# 1. Open Kaggle notebook: notebook/notebookc937c820ab.ipynb
# 2. Run all cells (requires Kaggle account with free T4 GPU)
# 3. After training completes, go to: Output tab → runs/classify/train2/weights/
# 4. Download 'best.pt'
# 5. Rename it to 'style_classifier.pt'
# 6. Place it in THIS directory:  ml-service/app/models/style_classifier.pt
#
# The StyleClassifier service (ml-service/app/services/classifier.py) will
# automatically load it. If the file is not present, it falls back to the
# generic pre-trained YOLOv8s-cls weights.
