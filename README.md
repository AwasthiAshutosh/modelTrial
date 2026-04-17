# Decoraid AI - Interior Design Platform

Decoraid is an end-to-end AI platform that reimagines interior spaces. Using YOLOv8 for object detection and Stable Diffusion with ControlNet for redesign, it transforms room photos into professionally designed spaces while preserving the original layout.

## 🚀 Getting Started

### Prerequisites

-   Docker and Docker Compose
-   NVIDIA GPU with CUDA (recommended for ML Service)

### Running with Docker

1.  Clone the repository.
2.  Run the platform:
    ```bash
    docker-compose up --build
    ```
3.  Access the platform:
    -   Frontend: `http://localhost`
    -   Backend API: `http://localhost:5000`
    -   ML Service: `http://localhost:8000`

### Local Development Setup

#### ML Service (FastAPI)
```bash
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Backend (Express)
```bash
cd backend
npm install
npm run dev
```

#### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

## 🏗 Architecture

-   **Frontend**: React + Vite + Tailwind CSS + Framer Motion.
-   **Backend**: Express.js Gateway for orchestration.
-   **ML Service**: FastAPI + YOLOv8 + Diffusers (SD 1.5 & ControlNet).

## 🎨 Supported Styles

-   **Scandinavian**: Minimalistic, light woods, functional.
-   **Modern**: Sleek, high contrast, sophisticated.
-   **Boho**: Eclectic, vibrant, many plants.
-   **Industrial**: Raw materials, exposed brick, dark leather.

## 📓 Google Colab

A complete pipeline for running in the cloud is available in `notebook/InteriorDesignAI.ipynb`.
