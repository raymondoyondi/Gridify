# Gridify

A smart web dashboard powered by GenAI that lets users use natural language to instantly generate custom charts, summaries, and layouts.

## 🚀 Features

- Natural language to dashboard: type what you want and Gridify generates charts and layouts.
- AI-powered charts and summaries using local or hosted LLMs.
- Extensible frontend charting with Recharts and Chart.js.
- Example ML integration with scikit-learn for model training and serving.

## 🛠️ Tech Stack

- Frontend: TypeScript, React, Tailwind CSS (UI)
  - Charting: Recharts, Chart.js (react-chartjs-2)
- Backend: Python (FastAPI example scaffold available) or Node.js (existing server.ts)
- Database: PostgreSQL (docker-compose service included)
- Models & LLMs:
  - scikit-learn for classical ML models (training & saving examples in /examples)
  - Ollama + Llama 3 for local LLM inference (docs and Makefile targets provided)
- Dev & Deployment: Docker, Docker Compose, Makefile targets for common tasks

## ⚙️ Local Setup

Prerequisites
- Docker & Docker Compose
- Python 3.10+
- Node.js 16+ and npm or yarn

Steps
1. Clone the repo

```bash
git clone https://github.com/raymondoyondi/Gridify.git
cd Gridify
```

2. Install Python deps

```bash
make deps
```

3. Install frontend deps (from repo root)

```bash
make frontend-install
```

4. Start infrastructure (Postgres + optional Ollama placeholder)

```bash
make start
```

If you prefer running Ollama locally with the Ollama CLI, run:

```bash
ollama pull <model-name>
ollama serve
```

5. Initialize the database schema

```bash
make db-init
```

6. Seed example data

```bash
make seed
```

7. Train the example scikit-learn model

```bash
make model-train
```

8. Build the frontend static assets

```bash
make frontend-build
```

9. Run the application

- If you have a backend server (e.g., FastAPI or Node), start it according to its README (the Makefile and docs include examples and scaffolding suggestions).

Open your browser at http://localhost:3000 (or the port your server serves on).

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.
