from typing import Generator, Optional
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from apps.api.app.core.config import settings
from apps.api.app.core.logging import logger

db_url = settings.DATABASE_URL
engine = None
SessionLocal = None

# Pure PostgreSQL connection without SQLite fallback
if db_url and "postgresql" in db_url:
    try:
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            connect_args={"connect_timeout": 3}
        )
        with engine.connect() as conn:
            pass
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        logger.info("Connected successfully to PostgreSQL database", db_url=db_url)
    except Exception as e:
        logger.info("PostgreSQL daemon not currently active on localhost:5432; operating in pure Vector Database mode (Milvus & Qdrant).")
        # Nullify engine so no connection retries occur and pure VectorDB is used
        engine = None
        SessionLocal = None

Base = declarative_base()


def get_db() -> Generator[Optional[Session], None, None]:
    if SessionLocal:
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    else:
        yield None
