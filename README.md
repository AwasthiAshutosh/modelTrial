# Decoraid AI — Interior Design Platform

An end-to-end AI platform that reimagines interior spaces. Upload a room photo,
pick a style, and watch your room transform — powered by YOLOv8 and Stable
Diffusion with ControlNet.

## Architecture

```
Browser (React + Vite)
  └─► Backend Gateway (Express.js :5000)
        └─► ML Service (FastAPI :8000)
              ├─ ObjectDetector    — YOLOv8n (COCO, furniture detection)
              ├─ StyleClassifier   — YOLOv8s-cls (trained on 19 interior styles)
              ├─ PromptEngine      — Builds Stable Diffusion conditioning text
              └─ ImageGenerator   — SD v1.5 + ControlNet Canny (layout-preserving)
```

## Supported Styles

| Style | Description |
|---|---|
| **Auto-Detect** | Classifier picks from the uploaded image |
| **Modern** | Sleek, high-contrast, neutral palette |
| **Scandinavian** | Light woods, white walls, minimalist |
| **Boho** | Eclectic, plants, warm earthy tones |
| **Industrial** | Exposed brick, metal, dark leather |
| **Mid-Century Modern** | Retro organic shapes, warm wood |
| **Contemporary** | Clean geometry, open floor plan |
| **Traditional** | Rich wood, symmetrical, formal |
| **Mediterranean** | Terracotta, arched doorways, tiles |

## Quick Start

### Option 1 — Docker (Recommended)

> Requires Docker Desktop + (optionally) NVIDIA GPU with CUDA.
> Remove the `deploy:` block in `docker-compose.yml` for CPU-only machines.

```bash
docker-compose up --build
```

Access:
- **Frontend:**   http://localhost
- **Backend API:** http://localhost:5000
- **ML Service:** http://localhost:8000/health

> ⚠️ First boot downloads ~5 GB of model weights. Subsequent starts use the cached `hf_cache` Docker volume.

### Option 2 — Local Development

**Terminal 1 — ML Service (FastAPI)**
```bash
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Backend (Express)**
```bash
cd backend
npm install
npm run dev
```

**Terminal 3 — Frontend (Vite)**
```bash
cd frontend
npm install
npm run dev
```
Open: http://localhost:5173

## Integrating the Trained Style Classifier

The notebook `notebook/notebookc937c820ab.ipynb` trains a YOLOv8s style classifier on Kaggle.
To use it in production:

1. Run the notebook on Kaggle (free T4 GPU, ~1.5 hrs).
2. Download `runs/classify/train2/weights/best.pt` from the Output tab.
3. Save it to `ml-service/app/models/style_classifier.pt`.
4. Restart the ML service — it auto-loads from that path.

See `ml-service/app/models/README.md` for detailed instructions.

## Training LoRA Adapters (Optional)

To fine-tune custom style weights for Stable Diffusion:

```bash
# Download the HuggingFace training script
wget https://raw.githubusercontent.com/huggingface/diffusers/main/examples/dreambooth/train_dreambooth_lora.py

# Prepare data (creates folder structure)
python ml/training/prepare_data.py

# Add 20-30 images per style to data/generation/<style>/
# Then train each style
python ml/training/train_generation.py --style scandinavian --steps 500
```

Load the trained LoRA in `generator.py`:
```python
self.pipe.load_lora_weights("models/lora/scandinavian")
```
