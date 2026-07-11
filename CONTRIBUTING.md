# Contributing to Gridify

Thank you for your interest in contributing to Gridify! We welcome community contributions to help improve this AI-powered dashboard ecosystem. 

Please take a moment to review this document before submitting your first Pull Request.

---

## 🏗️ Development Workflow

### 1. Fork & Clone
First, fork the repository to your own GitHub account, then clone it locally:
```bash
git clone https://github.com
cd Gridify
```

### 2. Create a Feature Branch
Always create a descriptive branch for your isolated work:
```bash
# For features
git checkout -b feature/your-feature-name

# For bug fixes
git checkout -b fix/your-bug-name
```

### 3. Setup Your Environment
Follow the local setup guide in the `README.md` to ensure your Docker infrastructure, PostgreSQL database, and Python/Node environments are running properly.

---

## 🎨 Code Quality & Coding Standards

To maintain code health across our diverse stack, please adhere to the following rules:

### Frontend (TypeScript / React)
- **Typing**: Strict TypeScript is required. Avoid using `any`.
- **Components**: Use functional components with hooks. 
- **Styling**: Use Tailwind CSS classes. Keep styles modular and clean.
- **Charts**: If modifying layout wrappers, test changes against both Recharts and Chart.js components.

### Backend (Python / FastAPI)
- **Type Hints**: Use native Python type hints for all function definitions and Pydantic models.
- **Async**: Prefer `async def` for endpoints unless utilizing blocking synchronous libraries.
- **Database**: Use SQLAlchemy patterns that match the existing schema initializations.

---

## 🧪 Testing Changes

Before committing, verify that your changes do not break the core stack workflows:

1. **Verify Backend**: Ensure data seeding and ML training runs without errors:
   ```bash
   make seed
   make model-train
   ```
2. **Verify Frontend**: Test your production build locally:
   ```bash
   make frontend-build
   ```

---

## 🚀 Submitting a Pull Request

When your changes are ready, submit them for review:

1. **Commit cleanly**: Write concise, descriptive commit messages.
2. **Push your branch**: 
   ```bash
   git push origin feature/your-feature-name
   ```
3. **Open a PR**: Navigate to the original Gridify repository and click "New Pull Request".
4. **Fill out the template**: Inform us clearly about:
   - What problem is solved or what feature is added.
   - Any modifications to the database schema or configuration variables (`S3`, `Ollama`).
   - Steps you took to test the changes.

---

## 💡 Community & Issues
- **Found a Bug?** Search existing issues before opening a new one. Provide reproducible environment details (OS, Docker version, Node/Python versions).
- **Have an Idea?** Open an issue tagged with `enhancement` to discuss major structural layout changes or new LLM model additions before writing code.
