# Gridify

A smart web dashboard powered by GenAI that lets users use natural language to instantly generate custom charts, summaries, and layouts.

## 🚀 Features

- Natural language to dashboard: type what you want and Gridify generates charts and layouts.
- AI-powered charts and summaries using local or hosted LLMs.
- Extensible frontend charting with Recharts and Chart.js.
- Example ML integration with scikit-learn for model training and serving.

## 🛠️ Tech Stack (updated)

- Frontend: TypeScript, React, Tailwind CSS (UI)
  - Charting: Recharts, Chart.js (react-chartjs-2)
- Backend: Python (FastAPI example scaffold available) or Node.js (existing server.ts)
- Database: PostgreSQL (docker-compose service included)
- Models & LLMs:
  - scikit-learn for classical ML models (training & saving examples in /examples)
  - Ollama + Llama 3 for local LLM inference (docs and Makefile targets provided)
- Dev & Deployment: Docker, Docker Compose, Makefile targets for common tasks

## 📁 What's new (added files)

- Makefile — helper targets: setup, deps, start, stop, db-init, seed, frontend-install, frontend-build, ollama-pull, model-train
- docker-compose.yml — postgres service + Ollama placeholder
- requirements.txt — Python dependencies (scikit-learn, pandas, numpy, psycopg2-binary, SQLAlchemy, python-dotenv, joblib)
- docs/next-steps.md — recommended roadmap (Alembic, FastAPI scaffold, CI, etc.)
- docs/dev-setup.md — developer setup guide
- examples/seed_db.py — DB schema creation and seed script
- examples/train_and_save_model.py — small scikit-learn training example
- frontend/package-scripts.md — Recharts and Chart.js examples

These are committed on the main branch.

## ⚙️ Quick local setup (recommended)

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

## Environment and secrets
- Do not commit production credentials. Use a .env file (see .env.example) or environment variables.
- The example scripts use the DATABASE_URL env var. Default used by examples: postgres://gridify:gridify_password@localhost:5432/gridify

## Next steps and customization
- Pin dependency versions in requirements.txt and frontend lockfiles for reproducible builds.
- Add Alembic migrations (docs/next-steps.md recommends this) and a FastAPI backend scaffold (I can add these in a feature branch).
- Tell me a preferred Llama 3 model name if you want me to add Makefile automation to pull it via Ollama.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
