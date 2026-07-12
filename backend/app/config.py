"""Application configuration using Pydantic Settings."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Core API
    GEMINI_API_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    PYTHON_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    
    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # Database
    DATABASE_URL: str = "postgresql://gridify:gridify_password@localhost:5432/gridify"
    
    # DuckDB
    DUCKDB_PATH: str = "./data/gridify.duckdb"
    
    # Vector DB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8000
    QDRANT_URL: Optional[str] = None
   
    # LLM Configuration
    LITELLM_API_KEY: Optional[str] = None
    LLM_PROVIDER: str = "gemini"
    LLM_MODEL: str = "gemini-3.5-flash"
    VLLM_BASE_URL: Optional[str] = None
    
    # LLM Response Caching
    LLM_CACHE_ENABLED: bool = True
    LLM_CACHE_TTL: int = 3600  # seconds
    LLM_CACHE_PREFIX: str = "gridify:llm:"
    
    # Monitoring
    PROMETHEUS_ENABLED: bool = False
    GRAFANA_URL: Optional[str] = None
    
    # Feature Flags
    USE_POLARS: bool = True
    # Native Google GenAI SDK powered agent workflows (replaces LangChain).
    USE_AI_AGENT: bool = True
    ASYNC_PROCESSING_ENABLED: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
