"""Application configuration using Pydantic Settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    # Core API
    GEMINI_API_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    PYTHON_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    
    # Temporal (optional durable execution alongside Celery).
    # When enabled, long-running workflows run on Temporal instead of Celery
    # so they can pause, resume, and track deep historical states.
    TEMPORAL_ENABLED: bool = False
    TEMPORAL_HOST: str = "localhost:7233"
    TEMPORAL_NAMESPACE: str = "gridify"
    TEMPORAL_TASK_QUEUE: str = "gridify-tasks"

    # Valkey / Redis (Valkey is a Redis-compatible drop-in; redis-py client
    # works against Valkey because Valkey speaks the RESP protocol).
    VALKEY_URL: str = "valkey://localhost:6379/0"
    REDIS_URL: str = "valkey://localhost:6379/0"
    CELERY_BROKER_URL: str = "valkey://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "valkey://localhost:6379/0"
    
    # Database
    DATABASE_URL: str = "postgresql://gridify:gridify_password@localhost:5432/gridify"
    
    # DuckDB
    DUCKDB_PATH: str = "./data/gridify.duckdb"
    
    # Vector DB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8000
    QDRANT_URL: Optional[str] = None
   
    # LLM Gateway Proxies (Portkey / Langfuse).
    # When configured, all LiteLLM calls are routed through the gateway so
    # tracking, retries, budget limits, and fallbacks live outside the core
    # FastAPI code.
    LLM_GATEWAY_PROVIDER: str = "litellm"
    LLM_GATEWAY_API_KEY: Optional[str] = None
    LLM_GATEWAY_BASE_URL: Optional[str] = None
    LLM_GATEWAY_PORTKEY_API_KEY: Optional[str] = None
    LLM_GATEWAY_LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LLM_GATEWAY_LANGFUSE_SECRET_KEY: Optional[str] = None
    LLM_GATEWAY_LANGFUSE_HOST: str = "https://cloud.langfuse.com"

    # LLM Configuration
    LITELLM_API_KEY: Optional[str] = None
    LLM_PROVIDER: str = "gemini"
    LLM_MODEL: str = "gemini-3.5-flash"
    LLM_MAX_RETRIES: int = 2

    # Local LLM fallback (Mistral via vLLM OpenAI-compatible endpoint).
    # Used automatically by LLMService when the hosted model is rate-limited.
    VLLM_BASE_URL: Optional[str] = None
    VLLM_MODEL: str = "mistralai/Mistral-7B-Instruct-v0.3"
    VLLM_API_KEY: Optional[str] = None

    # AI safety guardrails (prompt-injection protection).
    GUARDRAILS_ENABLED: bool = True
    # Optional edge microservice / API gateway that runs the guardrail check
    # off the request path (async network layer) instead of in-process. When set,
    # the async guardrail middleware delegates to it over HTTP. When unset, the
    # heuristic check runs off the event loop via a worker thread.
    GUARDRAILS_EDGE_URL: Optional[str] = None
    
    # LLM Response Caching
    LLM_CACHE_ENABLED: bool = True
    LLM_CACHE_TTL: int = 3600  # seconds
    LLM_CACHE_PREFIX: str = "gridify:llm:"
    
    # Monitoring
    PROMETHEUS_ENABLED: bool = False
    GRAFANA_URL: Optional[str] = None
    
    # Native Google GenAI SDK powered agent workflows (replaces LangChain).
    USE_AI_AGENT: bool = True
    ASYNC_PROCESSING_ENABLED: bool = True


settings = Settings()
