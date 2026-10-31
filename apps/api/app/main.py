import os
import sys

# Automatically ensure project root is in sys.path regardless of CWD
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from apps.api.app.core.config import settings
from apps.api.app.core.logging import setup_logging, logger
from apps.api.app.core.database import engine, Base
from apps.api.app.models import *
from apps.api.app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Starting up Voice Vocabulary Platform Backend API...", app_name=settings.APP_NAME)
    # Ensure database tables exist if PostgreSQL engine active
    if engine is not None:
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database schemas verified.")
        except Exception as e:
            logger.error("Database schema verification warning", error=str(e))
    else:
        logger.info("Operating in pure Vector Database mode (Milvus & Qdrant) - No SQLite.")
    yield
    logger.info("Shutting down Voice Vocabulary Platform Backend API...")


app = FastAPI(
    title="Badaga & Marwari Voice Vocabulary Learning Platform API",
    description="Production-Grade Speech Recognition, Dual-path XLS-R Embeddings, Vector Retrieval, and Grounded AI Tutor",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handler for uniform error format (Section 16)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled API exception", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected server error occurred. Please contact the administrator.",
            "path": request.url.path
        }
    )


@app.get("/", tags=["Health"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "languages_supported": ["badaga", "marwari"]
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}


# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
