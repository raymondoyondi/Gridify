# Gridify Guardrails

This directory contains the [NVIDIA NeMo Guardrails](https://github.com/NVIDIA/NeMo-Guardrails)
configuration that protects the LLM entrypoints (`/api/gemini/command`) from
prompt injection, jailbreaks, and sensitive-data exfiltration.

## How it is wired

`backend/app/services/guardrails.py` exposes `GuardrailsService`, which runs a
**two-layer** defense:

1. **Heuristic scanner** — always on, no external dependency. Fast regex-based
   detection of the most common injection/jailbreak/secret-request patterns.
2. **NeMo Guardrails** — used automatically when the `nemoguardrails` package
   is installed *and* this config directory is present. It loads `config.yml`
   and `rails.co` and becomes the authoritative rail; heuristics still run
   first as a cheap pre-filter.

The FastAPI router (`app/routers/gemini.py`) calls `check_input()` on every
request and returns HTTP 400 with a safe message when a prompt is blocked.

## Enabling NeMo Guardrails

```bash
pip install nemoguardrails
```

No code changes are needed — `GuardrailsService` detects the package and this
config at startup. Set `GEMINI_API_KEY` in the environment (the config reads it
via `api_key_env_var`, so no secret is committed).

## Files

- `config.yml` — models, rails, and self-check prompts.
- `rails.co` — Colang flows that refuse when a self-check trips.

## Extending

Add new blocked patterns to `_INJECTION_PATTERNS` / `_SENSITIVE_PATTERNS` in
`guardrails.py` for the heuristic layer, and/or add new `self_check_*` prompts
and flows here for the NeMo layer.
