# Gridify

A smart web dashboard powered by GenAI that lets users use natural language to instantly generate custom charts, summaries, and layouts.

## 🚀 Features

- Natural language to dashboard: type what you want and Gridify generates charts and layouts.
- AI-powered charts and summaries using local or hosted LLMs.
- Extensible frontend charting with Recharts and Chart.js.
- Example ML integration with scikit-learn for model training and serving.

## 🛠️ Tech Stack

- Frontend: TypeScript, React, Tailwind CSS
  - Charting: Recharts, Chart.js
- Backend: Python/FastAPI
- Storage: AWS S3 
- Database: PostgreSQL
- Models & LLMs:
  - scikit-learn for classical ML models
  - Ollama + Llama 3 for local LLM inference
- Dev & Deployment: Docker

## ⚙️ Local Setup

Prerequisites
- Docker & Docker Compose
- Python 3.10+
- Node.js 16+ and npm or yarn
- AWS Account and S3 Bucket credentials

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

Open your browser at http://localhost:3000 (or the port your server serves on).

# 🤝 Contributing

We welcome contributions to Gridify! To make the process smooth, please follow these steps:

1. **Fork the Repository**: Create your own fork of the project.
2. **Create a Feature Branch**: Work on a descriptive branch (`git checkout -b feature/amazing-feature`).
3. **Commit Your Changes**: Keep commits clean and follow logical steps (`git commit -m 'Add amazing feature'`).
4. **Push to the Branch**: Upload your changes to GitHub (`git push origin feature/amazing-feature`).
5. **Open a Pull Request**: Submit your PR against the `main` branch with a clear description of the changes.

Please ensure your code follows the existing style guidelines, includes proper typing (TypeScript/Python Type Hints), and does not break existing application workflows.

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.
