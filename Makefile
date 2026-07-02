# Top-level Makefile for common developer tasks
.PHONY: setup deps start stop db-init seed frontend-install frontend-build ollama-pull model-train

setup: deps frontend-install
	@echo "Setup complete."

deps:
	pip install -r requirements.txt

start:
	docker-compose up -d

stop:
	docker-compose down

db-init:
	@echo "Initialize the database (create schema)."
	python3 examples/seed_db.py --init

seed:
	@echo "Seed the database with example data."
	python3 examples/seed_db.py

frontend-install:
	@echo "Install frontend dependencies (run from repo root)."
	cd frontend && npm install

frontend-build:
	@echo "Build frontend static assets"
	cd frontend && npm run build

ollama-pull:
	@echo "Pull a Llama 3 model via Ollama (replace <model-name>):"
	@echo "  ollama pull <model-name>"
	@echo "Start ollama server locally if needed: ollama serve"

model-train:
	python3 examples/train_and_save_model.py
