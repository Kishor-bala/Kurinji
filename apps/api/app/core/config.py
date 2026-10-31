import os
from typing import List, Optional
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: str = "development"
    APP_NAME: str = "voice-vocabulary-platform"
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "production-ready-jwt-secret-key-32-chars-long-voice-ai"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/voice_vocab_db"
    DATABASE_TEST_URL: Optional[str] = "sqlite:///./voice_vocab_local.db"

    # Cache & Celery
    REDIS_URL: str = "redis://localhost:6379/0"

    # Object Storage
    OBJECT_STORAGE_ENDPOINT: str = "http://localhost:9000"
    OBJECT_STORAGE_BUCKET: str = "voice-vocabulary-assets"
    OBJECT_STORAGE_ACCESS_KEY: str = "minioadmin"
    OBJECT_STORAGE_SECRET_KEY: str = "minioadmin"
    OBJECT_STORAGE_SECURE: bool = False

    # Milvus / Zilliz Cloud
    MILVUS_URI: Optional[str] = None
    MILVUS_USER: Optional[str] = None
    MILVUS_PASSWORD: Optional[str] = None
    MILVUS_TOKEN: Optional[str] = None
    MILVUS_DATABASE: str = "default"

    # Qdrant
    QDRANT_URL: Optional[str] = None
    QDRANT_API_KEY: Optional[str] = None
    QDRANT_COLLECTION: str = "scholarships"

    # Speech Model: XLS-R 300M
    XLSR_MODEL_ID: str = "facebook/wav2vec2-xls-r-300m"
    XLSR_MODEL_REVISION: str = "main"
    XLSR_DEVICE: str = "cpu"
    XLSR_POOLING: str = "masked_mean"
    EMBEDDING_PIPELINE_VERSION: str = "v1"

    # AI Providers
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GROQ_API_KEY: Optional[str] = None
    GROQ_FALLBACK_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Recognition & Calibration
    MAX_UPLOAD_BYTES: int = 20 * 1024 * 1024  # 20 MB
    MAX_AUDIO_DURATION_SECONDS: int = 15
    RECOGNITION_TOP_K: int = 15
    RRF_K: int = 60
    CONFIDENCE_ACCEPT_THRESHOLD: float = 0.75
    CONFIDENCE_AMBIGUOUS_DELTA: float = 0.08

    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()
