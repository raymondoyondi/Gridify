"""Application configuration using Pydantic Settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    GEMINI_API_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:5173"
    PYTHON_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    DATABASE_URL: str = "postgresql://gridify:gridify_password@localhost:5432/gridify"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
