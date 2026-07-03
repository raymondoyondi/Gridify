# LLM and Model Integration

This document explains the basic files added to the repository to support a minimal
scikit-learn model and a lightweight Ollama + Llama 3 wrapper.

Files added
- requirements.txt — Python dependencies for the model and utilities.
- models/train_model.py — Example training script that saves a joblib Pipeline.
- models/predict.py — Simple CSV-based prediction CLI.
- llm/ollama_client.py — Small wrapper around the `ollama` CLI to run prompts.
- Makefile — Convenience targets for creating a venv, installing deps, training, predicting, and a demo LLM call.

Quick start
1. Create a virtualenv and install dependencies:

    make install

2. Train a model (saves to models/model.joblib):

    make train

3. Predict on a CSV file (example expects a CSV with numeric feature columns):

    make predict INPUT=data/sample.csv OUTPUT=predictions.csv

4. Run an example LLM prompt (requires Ollama installed and a local Llama 3 model):

    make llm PROMPT="Summarize these results"

Notes and caveats
- Ollama and Llama 3 are not included here. You must install Ollama separately and pull any models you want to use.
- The ollama_client wrapper shells out to the `ollama` CLI. Different Ollama versions may have slightly different CLI flags; adjust llm/ollama_client.py if necessary.
- The model training script uses synthetic data as an example. Replace with your real dataset and preprocessing for production use.
- This integration is intentionally minimal to be easy to adapt.
