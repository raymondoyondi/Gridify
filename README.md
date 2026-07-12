# Gridify

A smart web dashboard powered by GenAI that lets users use natural language to instantly generate custom charts, summaries, and layouts.

## 🚀 Features

- Natural language to dashboard: type what you want and Gridify generates charts and layouts.
- AI-powered charts and summaries using local or hosted LLMs with LiteLLM fallback.
- Extensible frontend charting with Recharts, Chart.js, and tree-shaken Apache ECharts.
- Edge analytics with DuckDB-WASM running filter/sort/aggregation locally in the browser.
- Hybrid RAG with in-browser ONNX embeddings for semantic pre-filtering before cloud vector lookup.
- Example ML integration with scikit-learn for model training and serving.

## 🛠️ Tech Stack

### Frontend & UI
- **Core**: TypeScript, React 19, Vite 6
- **Styling**: Tailwind CSS 4 (native CSS Grid, `@theme` tokens), shadcn/ui, Radix UI
- **State Management**: Zustand
- **Charting & Visualization**:
  - Apache ECharts (advanced interactive charts — tree-shaken via `echarts/core` with only Line, Bar, Scatter, Heatmap, Treemap, Grid, Tooltip, VisualMap, and Canvas renderer)
  - D3.js (complex visualizations via React Flow)
  - Recharts, Chart.js (legacy support — dynamically imported via `React.lazy` so they only load when needed)
- **Data Pipeline Visualization**: React Flow
- **Animations**: Framer Motion, Motion
- **Edge Analytics**: DuckDB-WASM (filter/sort/aggregation in a browser web worker, off the FastAPI cluster)
- **Browser Embeddings**: ONNX Runtime Web in a dedicated Web Worker (lightweight in-browser embedding model for hybrid RAG pre-filtering, off main thread)
- **Icons**: Lucide React

### Backend & Data Processing
- **API Framework**: Python/FastAPI, Uvicorn
- **ORM**: SQLAlchemy
- **Async Task Queue**: Celery + Valkey
- **Durable Execution**: Temporal (optional, alongside Celery for long-running workflows with pause/resume/history)
- **Data Processing**:
  - DuckDB (primary analytical engine — English-to-SQL via Semantic Layer, larger-than-memory analytics, PostgreSQL direct-attach)
  - DuckDB-WASM (edge analytics in browser web worker for local filter/sort/aggregation)
  - Apache Arrow + PyArrow (zero-copy interchange and IPC streaming from DuckDB to the UI/LLM)
  - Apache Arrow Flight SQL (native Flight SQL protocol for high-throughput record batch streaming)
- **Vector Databases**: Chroma, Qdrant
- **Embedding Model**: sentence-transformers
- **Database**: PostgreSQL 15+
- **Object Storage**: AWS S3 (boto3)

### AI & Machine Learning
- **LLM Integration**:
  - Google Gemini API (native `@google/genai` / `google-generativeai` SDKs — no LangChain overhead)
  - LiteLLM (unified multi-provider interface with automatic Gemini → vLLM/Mistral fallback)
  - LLM Gateway abstraction (Portkey / Langfuse) for observability, retries, and budget tracking outside core FastAPI code
- **LLM Response Caching**: Redis-backed cache for repeated dashboard queries (sub-100ms cache hits)
- **LLM Evaluation**: Promptfoo suite grades text-to-chart/summary prompts in CI
- **Self-hosted LLMs**: vLLM, Hugging Face TGI
- **Vector Embeddings**: Chroma, Qdrant, sentence-transformers
- **Browser Embeddings**: ONNX Runtime Web (in-browser hybrid RAG pre-filtering with dynamic CDN model loading)
- **Classical ML**: scikit-learn

### Infrastructure & Deployment
- **Containerization**: Docker, Docker Compose
- **Orchestration**: Kubernetes + Helm
- **Infrastructure as Code**: Terraform
- **Cloud Provider**: AWS (VPC, RDS, ElastiCache, S3, CloudWatch)
- **CI/CD**: GitHub Actions
- **Testing**: Playwright, Pytest, Vitest

### Monitoring & Observability
- **Metrics**: Prometheus
- **Visualization**: Grafana
- **Alerting**: Alertmanager
- **Log Collection**: CloudWatch, JSON logging
- **Performance Monitoring**: Prometheus + exporters (Node, Redis, PostgreSQL)

### Development Tools
- **Code Quality**: ESLint, TypeScript, Prettier
- **Frontend Testing**: Vitest, Playwright
- **Backend Testing**: Pytest
- **Package Managers**: npm/yarn
- **Runtime**: Node.js 20+, Python 3.11+
- **Version Control**: Git, GitHub

## ⚙️ Quick Start

### Prerequisites
- Docker & Docker Compose (required for full stack)
- Node.js 20+ and npm/yarn
- Python 3.11+
- AWS Account (optional, for cloud deployment)

### Local Development (5 minutes)

1. **Clone the repository**
```bash
git clone https://github.com/raymondoyondi/Gridify.git
cd Gridify
```

2. **Install dependencies**
```bash
npm install
pip install -r requirements.txt
```

3. **Start the development stack**
```bash
npm run docker:compose:up    # Start data services (PostgreSQL, Valkey, Chroma, Prometheus, Grafana, Temporal)
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &  # Start FastAPI backend
npm run dev                  # Start frontend dev server (proxies /api to FastAPI)
```

4. **Access the application**
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000
- **Grafana Dashboard**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Chroma Vector DB**: http://localhost:8000

### Full Development Workflow

```bash
# Code quality & testing
npm run lint               # TypeScript type checking
npm run format             # Format code with Prettier
npm run test               # Run unit tests with Vitest
npm run e2e                # Run E2E tests with Playwright

# Build & deployment
npm run build              # Build for production
npm run docker:build       # Build Docker image
npm run terraform:plan     # Preview infrastructure changes
npm run terraform:apply    # Deploy to AWS

# Monitoring
npm run monitoring:up      # Start Prometheus, Grafana, Alertmanager
npm run docker:compose:logs # View all service logs

# Kubernetes
npm run k8s:apply          # Deploy to Kubernetes cluster
npm run k8s:delete         # Remove from Kubernetes
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Frontend
VITE_API_URL=http://localhost:3000

# Backend
GEMINI_API_KEY=your_api_key_here
DATABASE_URL=postgresql://gridify:gridify_password@localhost:5432/gridify
REDIS_URL=valkey://localhost:6379/0
DUCKDB_PATH=./data/gridify.duckdb

# Vector Database
CHROMA_HOST=localhost
CHROMA_PORT=8000

# AI/LLM Configuration
LLM_PROVIDER=gemini
LLM_MODEL=gemini-3.5-flash
USE_AI_AGENT=true          # native google-generativeai agent workflows (no LangChain)
ASYNC_PROCESSING_ENABLED=true

# LLM Gateway (optional - Portkey/Langfuse for observability)
LLM_GATEWAY_PROVIDER=litellm
LLM_GATEWAY_PORTKEY_API_KEY=your_portkey_key
LLM_GATEWAY_LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LLM_GATEWAY_LANGFUSE_SECRET_KEY=your_langfuse_secret_key

# Temporal (optional durable execution)
TEMPORAL_ENABLED=false
TEMPORAL_HOST=localhost:7233
TEMPORAL_NAMESPACE=gridify
TEMPORAL_TASK_QUEUE=gridify-tasks

# LLM Response Caching (Redis-backed, sub-100ms cache hits)
LLM_CACHE_ENABLED=true
LLM_CACHE_TTL=3600         # seconds
LLM_CACHE_PREFIX=gridify:llm:

# Monitoring
PROMETHEUS_ENABLED=true
```

Backend environment variables (see backend/.env.example):

```
GEMINI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=http://localhost:3000
PYTHON_ENV=development
```

### Docker Compose Services

The development stack includes:
- **PostgreSQL 15**: Main relational database
- **Valkey 8**: In-memory cache and Celery broker (Redis-compatible, open-source)
- **Chroma**: Vector database for embeddings
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Alertmanager**: Alert management
- **Node Exporter**: System metrics
- **Redis Exporter**: Valkey metrics
- **PostgreSQL Exporter**: Database metrics

### Production Deployment

#### AWS with Terraform
```bash
npm run terraform:init
npm run terraform:plan
npm run terraform:apply
```

This creates:
- VPC with public/private subnets
- RDS PostgreSQL database
- ElastiCache Valkey cluster
- S3 bucket with versioning
- CloudWatch logging
- Security groups

#### Kubernetes
```bash
npm run k8s:apply       # Deploy all services
npm run docker:compose:logs # Monitor deployment
```

Includes:
- 3 API replicas with auto-scaling
- 2 frontend replicas
- 2 Celery worker replicas
- 2 Temporal worker replicas (optional durable execution)
- Horizontal Pod Autoscaler (3-10 replicas based on CPU/memory)

## 📚 Architecture & Documentation

### System Architecture
- **Frontend**: React components with ECharts (tree-shaken), React Flow, Framer Motion for interactive dashboards; DuckDB-WASM and ONNX Runtime Web in a dedicated Web Worker for edge/browser analytics and hybrid RAG
- **Backend**: FastAPI with async task processing via Celery + Valkey; optional Temporal workflows for durable execution
- **Data Pipeline**: PostgreSQL → DuckDB (Apache Arrow, zero-copy IPC streaming, Flight SQL protocol) → native Gemini SDK for AI insights
- **Semantic Layer**: Structured JSON queries (measures/dimensions/filters) instead of raw SQL for safe English-to-SQL translation
- **LLM Gateway**: Portkey/Langfuse proxy abstraction for observability, retries, and budget tracking outside core FastAPI code
- **Vector Store**: Chroma/Qdrant for semantic search and RAG
- **Infrastructure**: Kubernetes with auto-scaling, monitored by Prometheus/Grafana

## 🚀 Key Features

### Data Intelligence
- **Natural Language Queries**: Convert English to SQL via Gemini AI
- **Real-time Analytics**: DuckDB for instant queries on large datasets
- **Smart Summaries**: Native Gemini SDK agents generate contextual insights
- **Vector Search**: Semantic search across documentation and data

### Visualization
- **Advanced Charts**: ECharts for scientific visualizations (heatmaps, treemaps, scatter)
- **Pipeline Visualization**: React Flow shows data transformation steps
- **Interactive Dashboards**: Drag-and-drop layout with Framer Motion animations
- **Real-time Monitoring**: Live metrics with Prometheus/Grafana

### Scalability
- **Horizontal Scaling**: Kubernetes auto-scales API from 3-10 replicas
- **Async Processing**: Celery workers handle long-running tasks
- **Edge Analytics**: DuckDB-WASM runs filter/sort/aggregation locally in the browser web worker, off the backend cluster
- **Efficient Data Handling**: Arrow zero-copy hand-off from DuckDB to the UI/LLM — no Pandas serialization boundary in the dashboard backend
- **In-Memory Analytics**: DuckDB for sub-second query times
- **Hybrid RAG**: ONNX Runtime Web in a dedicated Web Worker performs in-browser semantic pre-filtering before cloud Chroma lookup, with a deterministic hashing fallback

### Production Ready
- **CI/CD**: GitHub Actions with automated testing and deployment
- **Monitoring**: Prometheus metrics + 15+ alert rules
- **Infrastructure as Code**: Terraform for AWS deployment
- **Container Orchestration**: Kubernetes with health checks and auto-scaling

## 🛡️ Reliability, Scaling & Security

Recent hardening across the AI, data, and infrastructure layers:

### AI & LLM Reliability
* **LLM Gateway Abstraction:** `LLMGateway` (`backend/app/services/llm_gateway.py`) routes LiteLLM calls through Portkey or Langfuse when configured, offloading retries, budget tracking, and fallbacks from core FastAPI code.
* **Strict Structured Outputs:** Every LLM response for `/api/gemini/command` is constrained by a Gemini `response_schema` and validated against strict Pydantic V2 models (`backend/app/schemas/dashboard.py`). Malformed widget shapes can no longer reach the frontend and break Framer Motion / React Flow — the current layout is preserved instead.
* **Prompt-Injection Guardrails:** `GuardrailsService` (`backend/app/services/guardrails.py`) runs a built-in heuristic scanner plus optional NVIDIA NeMo Guardrails (config in `backend/guardrails/`). Blocked prompts return HTTP 400. Enable NeMo with `pip install nemoguardrails`.
* **LiteLLM Fallback:** `LLMService` (`backend/app/services/llm_service.py`) routes to hosted Gemini first and transparently falls back to a self-hosted Mistral via vLLM endpoint on rate limits/outages. Configure with `VLLM_BASE_URL` and `VLLM_MODEL`.

### Data Processing & Pipeline
* **Semantic Layer for English-to-SQL:** `SemanticLayer` (`backend/app/services/semantic_layer.py`) validates LLM-generated analytical queries against a whitelist of measures/dimensions and compiles safe parameterized SQL, eliminating raw SQL injection risk.
* **Flight SQL Protocol:** `GridifyFlightServer` (`backend/app/services/arrow_service.py`) now supports Arrow Flight SQL, letting clients stream high-throughput record batches directly from DuckDB over gRPC-Web/WebSockets without hitting the HTTP REST layer.
* **DuckDB-WASM Offload:** `duckdbClient.ts` runs DuckDB inside a web worker so filter/sort/micro-aggregation of cached telemetry executes locally in the browser, off the centralized FastAPI/Celery cluster. Pure SQL builders (`duckdbQueries.ts`) whitelist columns/directions to prevent injection.
* **Arrow IPC Streaming:** Apache Arrow streaming-format payloads (`query_to_arrow_ipc`) are sent from the backend to the frontend, where `arrowClient.ts` reconstructs tables client-side without `JSON.parse`.
* **Hybrid RAG:** `ragClient.ts` embeds queries with ONNX Runtime Web inside a dedicated Web Worker (dynamically imported from a CDN) and cosine-matches them against the cached semantic index in-browser before hitting the cloud Chroma store, with a deterministic hashing fallback for offline/tests.

### Frontend & State
* **Zustand Store:** `src/store/dashboardStore.ts` is the single source of truth for widgets, ordering, telemetry, summaries, and status.
* **Native CSS Grid:** Dashboard canvas migrated to a native CSS Grid (`gridify-canvas` / `gridify-col-N`) driven by Tailwind 4 `@theme` tokens. Widget spans come from each widget's column count; reflow is handled by the browser grid engine.
* **Code-Splitting:** Apache ECharts (~1 MB monolithic) is now tree-shaken via `echarts-for-react/lib/core` importing only Line/Bar/Scatter/Heatmap/Treemap charts plus Grid/Tooltip/VisualMap and Canvas renderer, cutting the chunk to ~594 KB (gzip 199 KB). React Flow (D3) pipeline is also loaded on demand via `React.lazy` (`src/components/charts/LazyCharts.tsx`).

### Infrastructure & Secrets
* **Valkey Cache:** Redis replaced with Valkey (`valkey/valkey:8-alpine`) for future-proof caching against restrictive licensing. The `redis-py` client remains compatible because Valkey speaks RESP.
* **Temporal Durable Execution:** Long-running workflows (dashboard generation, telemetry sync) can run on Temporal (`backend/temporal_app.py`) alongside Celery, with native pause/resume and deep historical state tracking.
* **PgBouncer Connection Pooling:** Configured via `docker-compose.yml` on port `6432` to pool connections between FastAPI and PostgreSQL, absorbing elastic connection spikes.
* **ElastiCache Valkey Cluster:** Set `REDIS_CLUSTER_MODE=true` (with a `rediss://` `REDIS_URL`) to use the cluster client.
* **Cloud Secrets Management:** `SECRETS_BACKEND=vault|aws` hydrates the environment from HashiCorp Vault or AWS Secrets Manager before settings load (`backend/app/utils/secrets.py`) — zero secrets are stored in the repo.

## 🧩 Recent Architectural Improvements

Four targeted upgrades that remove single-node, single-session, and
token/initialization bottlenecks:

### 1. Scalable OLAP Storage Tier (DuckDB → ClickHouse / MotherDuck)
A single file-attached `gridify.duckdb` per pod cannot scale horizontally. The
analytics tier now sits behind a `BaseOLAPEngine` (`backend/app/services/olap/`)
with three interchangeable implementations:

* `DuckDBOLAPEngine` — local in-process (default, zero infra).
* `ClickHouseOLAPEngine` — serverless/distributed OLAP over HTTP (no native driver).
* `MotherDuckOLAPEngine` — shared cloud DuckDB store (DuckDB wire-compatible).

Select with `OLAP_BACKEND` (`duckdb|clickhouse|motherduck`); the factory
(`get_olap_engine`) returns a singleton. Routers/agents depend only on the
interface, so all pods share one synchronized store. Inspect it at
`GET /api/olap/engine` and run read-only analytics via `GET /api/olap/query`.

### 2. Real-Time Collaborative Layout Sync
GenAI drafts and Framer-Motion drags used to live only in ephemeral Zustand
state. `src/lib/realtimeSync.ts` introduces a transport-agnostic
`RealtimeProvider` plus a `DashboardSync` binder:

* `BroadcastChannelProvider` — zero-dep cross-tab sync (default; in-process hub
  fallback for SSR/tests).
* `YjsProvider` — multiplayer CRDT over WebSocket, lazy-loaded so it never
  bloats the bundle or test env unless selected.
* `SupabaseProvider` — hosted realtime (Postgres changes) alternative.

Layouts are now durable and shareable via `LayoutRepository`
(`backend/app/services/layout_repository.py`) — in-memory by default, PostgreSQL
when `DATABASE_URL` is reachable — exposed at `GET/POST/DELETE /api/layouts`.

### 3. Formalized Semantic Layer (RBAC + Dialect-Aware + Compact Prompts)
`backend/app/services/semantic_model.py` formalizes the abstraction fed to Gemini
so the LLM gets a structured description instead of the raw schema:

* **Role-based data security** — `authorize()` rejects any measure/dimension/
  filter a role may not access *before* SQL is compiled (`analyst` vs `viewer`).
* **Dialect-aware compile** — one validated logical query emits DuckDB or
  ClickHouse SQL (`compile(..., dialect=...)`).
* **Token-efficient context** — `build_prompt_context(role)` emits a compact
  description, shrinking prompts and constraining the model to its entitlements.
  Try `GET /api/semantic/context?role=viewer` and `POST /api/semantic/compile`.

### 4. Edge-RAG Tiered Quantization & Streaming
Downloading the ONNX model + full vector index hurts "Time to First Query" on
slow networks. Two additions fix this:

* `src/lib/quantization.ts` — scalar `float32 → int8` quantization (and int8
  cosine) shrinks embedding payloads ~4x with negligible pre-filter loss.
* `src/lib/modelStreamCache.ts` — chunked Cache Storage API delivery with
  **resume** (only missing chunks are re-fetched) and an in-memory fallback.
  The ONNX worker returns quantized embeddings, and `ragClient.ts` caches/restores
  a quantized index so refreshes skip re-embedding.

## 🧪 Testing

```bash
# Frontend unit tests (Vitest)
npm run test               # Run unit tests
npm run test:coverage      # Generate coverage report
npm run test:ui            # UI mode for interactive testing

# E2E tests (Playwright)
npm run e2e                # Run all E2E tests
npm run e2e:debug          # Debug mode
npm run e2e:ui             # UI mode for interactive testing

# Backend tests
pytest backend/tests -v --cov=backend
```

## 🤝 Contributing

We welcome contributions! Please:

1. **Fork the Repository**: Create your own fork of the project.
2. **Create a Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Code Quality**: Run `npm run lint` and `npm run format` before committing
4. **Test**: Add tests for new features and run `npm run test && npm run e2e`
5. **Commit**: Write clear commit messages following conventional commits
6. **Push**: Upload your changes to GitHub
7. **Pull Request**: Submit PR against `main` with clear description

**Code Standards**:
- TypeScript strict mode (no `any` types)
- Python type hints for all functions
- Follow existing style guidelines
- Write unit tests for business logic
- Document complex algorithms

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.
