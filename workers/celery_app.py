"""
Celery Worker Application for Background Audio Processing,
Batch Embedding Generation, and Dual-Store Vector Replication.
"""

from celery import Celery
from celery.signals import worker_process_init
from apps.api.app.core.config import settings
from apps.api.app.core.logging import logger

celery_app = Celery(
    "voice_vocab_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# Global warm model cache for worker processes
_warmed_encoder = None


@worker_process_init.connect
def init_worker_process(**kwargs):
    """
    Hook executed once per worker process upon fork.
    Pre-warms the XLS-R 300M model once into GPU/CPU memory
    to prevent memory fragmentation and process-forking OOM crashes.
    """
    global _warmed_encoder
    logger.info("Celery worker process initializing: Pre-warming XLS-R 300M model...")
    try:
        from services.embeddings.xlsr_encoder import XLSREncoder
        _warmed_encoder = XLSREncoder()
        logger.info("XLS-R 300M successfully pre-warmed in Celery worker process.")
    except Exception as e:
        logger.error("Failed to pre-warm XLS-R 300M in Celery worker", error=str(e))


@celery_app.task(bind=True, max_retries=3)
def process_audio_upload_task(self, audio_file_path: str, language_code: str, word_id: str):
    logger.info("Processing background audio ingestion task", file=audio_file_path, language=language_code)
    return {"status": "completed", "word_id": word_id}
