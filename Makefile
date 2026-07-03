# Makefile for common dev tasks
PY=python3
VENV=.venv
PIP=$(VENV)/bin/pip
PYBIN=$(VENV)/bin/python

.PHONY: env install train predict llm pull-ollama-model

env:
	$(PY) -m venv $(VENV)
	@echo "Created virtualenv in $(VENV). Activate with: source $(VENV)/bin/activate"

install: env
	$(PIP) install -r requirements.txt

train:
	$(PYBIN) -m models.train_model --out models/model.joblib

predict:
	# Example: make predict INPUT=data/sample.csv OUTPUT=predictions.csv
	$(PYBIN) -m models.predict --input $(INPUT) --output $(OUTPUT) --model models/model.joblib

llm:
	# Run an example prompt via local Ollama. Provide PROMPT on the make command line.
	# Example: make llm PROMPT="Hello"
	$(PYBIN) -c "from llm.ollama_client import run_prompt; import os; print(run_prompt(os.environ.get('PROMPT', 'Hello from Ollama!'), model='llama3'))"

pull-ollama-model:
	# Example command to pull a model via ollama. Uncomment and edit if you have access.
	# ollama pull llama3
	@echo "This target is a placeholder. Use 'ollama pull <model>' to fetch models locally if available."
