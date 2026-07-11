# Gridify

A smart web dashboard powered by GenAI that lets users use natural language to instantly generate custom charts, summaries, and layouts.

## 🚀 Features

- Natural language to dashboard: type what you want and Gridify generates charts and layouts.
- AI-powered charts and summaries using local or hosted LLMs.
- Extensible frontend charting with Recharts and Chart.js.
- Example ML integration with scikit-learn for model training and serving.

## 🛠️ Tech Stack

### Frontend & UI
- **Core**: TypeScript, React 19, Vite
- **Styling**: Tailwind CSS 4, shadcn/ui, Radix UI
- **Charting & Visualization**:
  - Apache ECharts (advanced interactive charts)
  - D3.js (complex visualizations)
  - Recharts, Chart.js (legacy support)
- **Data Pipeline Visualization**: React Flow
- **Animations**: Framer Motion, Motion

### Backend & Data Processing
- **API Framework**: Python/FastAPI, Express.js
- **Async Task Queue**: Celery + Redis
- **Data Processing**:
  - Apache Arrow / Polars (lightning-fast data manipulation)
  - DuckDB (in-memory analytical database)
  - Pandas (legacy support)
- **Vector Databases**: Chroma, Qdrant
- **Database**: PostgreSQL 15+

### AI & Machine Learning
- **LLM Integration**:
  - Google Gemini API
  - LangChain (structured AI agent workflows)
  - LlamaIndex (RAG pipelines)
  - LiteLLM (unified multi-provider interface)
- **Self-hosted LLMs**: vLLM, Hugging Face TGI
- **Vector Embeddings**: Chroma, Qdrant
- **Model Tracking**: MLflow, Weights & Biases
- **Classical ML**: scikit-learn

### Infrastructure & Deployment
- **Containerization**: Docker, Docker Compose
- **Orchestration**: Kubernetes + Helm
- **Infrastructure as Code**: Terraform/OpenTofu
- **Cloud Provider**: AWS (VPC, RDS, ElastiCache, S3)
- **CI/CD**: GitHub Actions
- **Testing**: Playwright, Cypress, Pytest

### Monitoring & Observability
- **Metrics**: Prometheus
- **Visualization**: Grafana
- **Alerting**: Alertmanager
- **Log Collection**: CloudWatch, JSON logging
- **Performance Monitoring**: Prometheus + exporters (Node, Redis, PostgreSQL)

### Development Tools
- **Code Quality**: ESLint, TypeScript, Prettier
- **Package Managers**: npm/yarn
- **Runtime**: Node.js 18+, Python 3.11+
- **Version Control**: Git, GitHub

## ⚙️ Quick Start

### Prerequisites
- Docker & Docker Compose (required for full stack)
- Node.js 18+ and npm/yarn
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
npm run docker:compose:up    # Start all services (PostgreSQL, Redis, Chroma, Prometheus, Grafana)
npm run dev                  # Start frontend dev server
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
npm run test               # Run unit tests
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
REDIS_URL=redis://localhost:6379/0
DUCKDB_PATH=./data/gridify.duckdb

# Vector Database
CHROMA_HOST=localhost
CHROMA_PORT=8000

# AI/LLM Configuration
LLM_PROVIDER=gemini
LLM_MODEL=gemini-3.5-flash
USE_LANGCHAIN=true
USE_POLARS=true
ASYNC_PROCESSING_ENABLED=true

# Monitoring
PROMETHEUS_ENABLED=true
```

### Docker Compose Services

The development stack includes:
- **PostgreSQL 15**: Main relational database
- **Redis 7**: In-memory cache and Celery broker
- **Chroma**: Vector database for embeddings
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Alertmanager**: Alert management
- **Node Exporter**: System metrics
- **Redis Exporter**: Redis metrics
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
- ElastiCache Redis cluster
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
- Horizontal Pod Autoscaler (3-10 replicas based on CPU/memory)

## 📚 Architecture & Documentation

### System Architecture
- **Frontend**: React components with ECharts, React Flow, Framer Motion for interactive dashboards
- **Backend**: FastAPI + Express with async task processing via Celery
- **Data Pipeline**: Polars for fast processing → DuckDB for analytics → LangChain for AI insights
- **Vector Store**: Chroma/Qdrant for semantic search and RAG
- **Infrastructure**: Kubernetes with auto-scaling, monitored by Prometheus/Grafana

## 🚀 Key Features

### Data Intelligence
- **Natural Language Queries**: Convert English to SQL via Gemini AI
- **Real-time Analytics**: DuckDB for instant queries on large datasets
- **Smart Summaries**: LangChain agents generate contextual insights
- **Vector Search**: Semantic search across documentation and data

### Visualization
- **Advanced Charts**: ECharts for scientific visualizations (heatmaps, treemaps, scatter)
- **Pipeline Visualization**: React Flow shows data transformation steps
- **Interactive Dashboards**: Drag-and-drop layout with Framer Motion animations
- **Real-time Monitoring**: Live metrics with Prometheus/Grafana

### Scalability
- **Horizontal Scaling**: Kubernetes auto-scales API from 3-10 replicas
- **Async Processing**: Celery workers handle long-running tasks
- **Efficient Data Handling**: Polars replaces Pandas for 10-100x speed
- **In-Memory Analytics**: DuckDB for sub-second query times

### Production Ready
- **CI/CD**: GitHub Actions with automated testing and deployment
- **Monitoring**: Prometheus metrics + 15+ alert rules
- **Infrastructure as Code**: Terraform for AWS deployment
- **Container Orchestration**: Kubernetes with health checks and auto-scaling

## 🧪 Testing

```bash
# Unit tests
npm run test
npm run test:coverage    # Generate coverage report

# E2E tests (Playwright)
npm run e2e              # Run all E2E tests
npm run e2e:debug        # Debug mode
npm run e2e:ui           # UI mode for interactive testing

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
