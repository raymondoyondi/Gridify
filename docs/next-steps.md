# Next steps (roadmap)

This file lists recommended next steps to improve Gridify's developer experience, integrations, and CI/CD. These are ready-to-apply changes I can add to the main branch on your instruction.

1. Pin Python and JS package versions
- Update requirements.txt with explicit, tested versions.
- Commit frontend package-lock.json or yarn.lock to the repo.
- Why: reproducible installs and fewer surprises across environments.

2. Add database migrations (Alembic)
- Add Alembic configuration and an initial migration that creates the charts table.
- Provide make targets for `alembic revision --autogenerate` and `alembic upgrade head`.
- Why: safe, repeatable schema changes across environments.

3. Add a minimal backend service (FastAPI)
- Scaffold a small FastAPI app in `backend/` that reads DATABASE_URL from env, connects to Postgres via SQLAlchemy, and exposes endpoints:
  - GET /charts — returns rows from charts table
  - POST /predict — example endpoint that loads the saved scikit-learn model and returns a prediction
- Add Dockerfile and a docker-compose service for the backend.
- Why: provides an example of how the DB, ML model, and frontend can be wired together.

4. Ollama model configuration and automation
- Replace the placeholder ollama service in docker-compose with either:
  - a) a documented local CLI workflow (preferred) that shows `ollama pull <model>` and `ollama serve`, or
  - b) a container-based approach if you have an approved image to run Ollama in your environment.
- Add a Makefile target to pull a named Llama 3 model (make ollama-pull MODEL=llama3).
- Why: makes it straightforward for contributors to get the LLM model ready.

5. Add CI workflows
- Add GitHub Actions to run linters (flake8/ruff, eslint), tests, and optionally build the frontend and backend images.
- Add a workflow to build and publish a Docker image (or run a smoke test) on push to main or when PRs are opened.
- Why: ensures code quality and prevents regressions.

6. Model serving and versioning
- Add an endpoint or small service to serve the trained scikit-learn model (FastAPI with joblib) and a simple OpenAPI contract.
- Add versioning for saved models (models/model-v1.joblib) and a simple registry mechanism (metadata in DB).
- Why: reproducible model deployments and easy rollbacks.

7. Pin a Llama 3 model name (optional)
- If you have a preferred Llama 3 model available via Ollama, tell me the exact model name and I will add example commands and a Makefile target to pull it and optionally start the server.

8. Add examples and tests
- Add unit tests for the backend endpoints and a basic end-to-end test that starts a test Postgres and verifies the seed + fetch flow.
- Add small frontend snapshot tests for chart components.

9. Improve secrets handling
- Add a .env.example and update the docs to use python-dotenv or other secret management; avoid committing real secrets.

10. Documentation improvements
- Expand docs/dev-setup.md with quick reproducible steps for Windows, macOS, and Linux.
- Add architecture.md describing how the backend, frontend, DB, LLM, and ML model interact.

How I will proceed if you confirm
- I will commit this file to main (docs/next-steps.md) and then apply the next items in order (one at a time or grouped) to a feature branch for review, or directly to main if you prefer.

Choose one option:
- Commit the next actionable items directly to main now (I will push Alembic + FastAPI + CI in separate commits).
- Create a feature branch (recommended) named `feat/integrations` and push the changes there, then open a PR against main.

Please confirm which option you prefer and whether to proceed now. If you want any of the steps prioritized or modified, tell me which ones to prioritize or any specifics (e.g., preferred Llama 3 model name or Python/JS versions).