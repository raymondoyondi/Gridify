# Developer setup and integration guide

This document explains how to get the development environment running locally with PostgreSQL, Ollama (Llama 3), scikit-learn, and the frontend charting libraries.

Prerequisites
- Docker & Docker Compose
- Node.js (16+ recommended) and npm or yarn
- Python 3.10+

Quick start
1. Install Python deps:
   ```
   make deps

2. Install frontend deps:
   ```
   make frontend-install

3. Start infrastructure:
   ```
   make start
   ```
   
   This will start PostgreSQL (and an optional Ollama placeholder container). If you prefer to run Ollama locally via the `ollama` CLI, run that instead (see "Ollama" below).

Database
- Connection string (example):
```
postgres://gridify:gridify_password@localhost:5432/gridify
```

- Initialize the DB and create example tables:
  ```
  make db-init
  
- Seed example data:
  ```
  make seed

Ollama and Llama 3
- Ollama provides an easy way to run LLMs locally. To pull a Llama 3 family model using the ollama CLI:
  ```
  ollama pull <model-name>
  ```
  
  Example (replace with an available model name):
  ```
  ollama pull llama3 --version x.y

- Start a local Ollama server if needed:
  ```
  ollama serve

- From Python, you can call the Ollama HTTP API (`http://localhost:11434`) or use a Python client if available.

Training and ML
- Example training script is in `examples/train_and_save_model.py`. Run:
  ```
  make model-train

Frontend charts
- Install Recharts and Chart.js (see `frontend/package-scripts.md`).
- See examples in `examples/frontend_chart_examples.md` for component snippets.

Notes
- If you want migrations, consider adding Alembic or a framework-specific migration tool.
- Pin package versions as needed for reproducibility.
