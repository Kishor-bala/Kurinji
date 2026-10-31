"""
Audio Embedding & Dual VectorDB Ingestion Service.
Processes verified recordings through Silero VAD segmentation and XLS-R 300M acoustic embeddings,
persisting vectors and complete word metadata in both Milvus Lite and Qdrant.
"""

import os
import threading
import soundfile as sf
import numpy as np
from typing import Dict, Any, List, Optional
from apps.api.app.core.logging import logger
from services.audio.preprocessing import AudioPreprocessor
from services.embeddings.xlsr_encoder import XLSREncoder
from services.vector_store.base import VectorRecord, compute_vector_id
from services.vector_store.vocab_store import vocab_store


class AudioEmbeddingService:
    _instance = None

    def __init__(self):
        self.preprocessor = AudioPreprocessor()
        self.encoder = XLSREncoder()
        self.is_running = False
        self.progress = {
            "is_running": False,
            "total_recordings": 0,
            "processed_recordings": 0,
            "total_vectors_indexed": 0,
            "current_file": None,
            "errors": [],
            "completed": False
        }
        self._lock = threading.Lock()

    def get_status(self, vector_router=None) -> Dict[str, Any]:
        with self._lock:
            status = dict(self.progress)

        # Query live vector counts if vector_router provided
        if vector_router:
            status["vector_stores"] = self.get_collection_counts(vector_router)
        return status

    def get_collection_counts(self, vector_router) -> Dict[str, Any]:
        counts = {
            "milvus": {},
            "qdrant": {}
        }
        collections = [
            "badaga_original_v1", "badaga_denoised_v1",
            "marwari_original_v1", "marwari_denoised_v1"
        ]

        # Milvus counts
        if vector_router.primary.health_check() and vector_router.primary.client:
            try:
                m_client = vector_router.primary.client
                for col in collections:
                    if m_client.has_collection(col):
                        try:
                            stats = m_client.get_collection_stats(col)
                            counts["milvus"][col] = stats.get("row_count", 0)
                        except Exception:
                            try:
                                m_client.load_collection(col)
                                res = m_client.query(collection_name=col, filter='word_id != ""', output_fields=["count(*)"])
                                counts["milvus"][col] = res[0].get("count(*)", 0) if res else 0
                            except Exception:
                                counts["milvus"][col] = 0
                    else:
                        counts["milvus"][col] = 0
            except Exception as e:
                counts["milvus"]["error"] = str(e)

        # Qdrant counts
        if vector_router.fallback.health_check() and vector_router.fallback.client:
            try:
                q_client = vector_router.fallback.client
                for col in collections:
                    try:
                        info = q_client.get_collection(col)
                        counts["qdrant"][col] = info.points_count or 0
                    except Exception:
                        counts["qdrant"][col] = 0
            except Exception as e:
                counts["qdrant"]["error"] = str(e)

        return counts

    def embed_recording(
        self,
        record: Dict[str, Any],
        vector_router,
        dataset_version: str = "v1.0.0"
    ) -> int:
        """
        Processes one audio recording: VAD segmentation, dual-path denoising,
        XLS-R 1024-d embeddings, and insertion into both Milvus and Qdrant.
        Returns number of vectors indexed.
        """
        file_path = record["file_path"]
        fname = record["filename"]
        wid = record["word_id"]
        lang = record["language_code"]
        spk_id = record.get("speaker_id") or ""
        spk_name = record.get("speaker_name") or "Native Speaker"
        eng = record.get("english_meaning") or ""
        tam = record.get("tamil_meaning") or ""
        source_w = record.get("source_word") or ""

        # 1. Load and validate audio
        waveform, sr, meta = self.preprocessor.load_and_validate_audio(file_path)

        # 2. Denoised derivative
        denoised_waveform = self.preprocessor.create_denoised_derivative(waveform, sr)

        # Save denoised copy to storage/denoised for rapid retrieval
        denoised_dir = "storage/denoised"
        os.makedirs(denoised_dir, exist_ok=True)
        denoised_path = os.path.join(denoised_dir, fname)
        if not os.path.exists(denoised_path):
            try:
                sf.write(denoised_path, denoised_waveform, sr, subtype="PCM_16")
            except Exception:
                pass

        # 3. VAD Speech Segmentation
        segments = self.preprocessor.detect_speech_segments(waveform, sr)
        if not segments:
            segments = [(0, int(len(waveform) / sr * 1000))]

        vectors_indexed = 0
        orig_col = f"{lang}_original_v1"
        den_col = f"{lang}_denoised_v1"

        for seg_idx, (s_ms, e_ms) in enumerate(segments):
            s_idx = int(sr * (s_ms / 1000.0))
            e_idx = int(sr * (e_ms / 1000.0))
            orig_slice = waveform[s_idx:e_idx]
            den_slice = denoised_waveform[s_idx:e_idx]

            # Enforce minimum length (200ms)
            if len(orig_slice) < int(sr * 0.2):
                continue

            # 4. Generate 1024-d XLS-R acoustic embeddings
            orig_vec, _ = self.encoder.encode_waveform(orig_slice, sr)
            den_vec, _ = self.encoder.encode_waveform(den_slice, sr)

            orig_v_id = compute_vector_id(dataset_version, wid, fname, f"orig_seg_{seg_idx}")
            den_v_id = compute_vector_id(dataset_version, wid, fname, f"den_seg_{seg_idx}")

            meta_payload = {
                "english_meaning": eng,
                "tamil_meaning": tam,
                "source_word": source_w,
                "speaker_name": spk_name,
                "segment_index": seg_idx,
            }

            orig_rec = VectorRecord(
                vector_id=orig_v_id,
                vector=orig_vec.tolist(),
                word_id=wid,
                language_code=lang,
                audio_asset_id=fname,
                recording_id=fname,
                speaker_id=spk_id,
                segment_start_ms=s_ms,
                segment_end_ms=e_ms,
                audio_variant="original",
                dataset_version=dataset_version,
                embedding_model_id="facebook/wav2vec2-xls-r-300m",
                embedding_model_revision="main",
                embedding_pipeline_version="v1",
                duration_ms=e_ms - s_ms
            )

            den_rec = VectorRecord(
                vector_id=den_v_id,
                vector=den_vec.tolist(),
                word_id=wid,
                language_code=lang,
                audio_asset_id=fname,
                recording_id=fname,
                speaker_id=spk_id,
                segment_start_ms=s_ms,
                segment_end_ms=e_ms,
                audio_variant="denoised",
                dataset_version=dataset_version,
                embedding_model_id="facebook/wav2vec2-xls-r-300m",
                embedding_model_revision="main",
                embedding_pipeline_version="v1",
                duration_ms=e_ms - s_ms
            )

            # Insert dual path into Milvus & Qdrant with complete word metadata
            vector_router.insert_vectors_dual(orig_col, [orig_rec], [meta_payload])
            vector_router.insert_vectors_dual(den_col, [den_rec], [meta_payload])
            vectors_indexed += 2

        return vectors_indexed

    def run_full_ingestion_sync(
        self,
        vector_router,
        language: Optional[str] = None,
        limit: Optional[int] = None
    ) -> Dict[str, Any]:
        """Runs the embedding ingestion synchronously across all matched recordings."""
        all_records = vocab_store.get_all_records_for_embedding()
        if language and language.lower().strip() not in ["all", ""]:
            all_records = [r for r in all_records if r["language_code"] == language.lower().strip()]

        if limit and limit > 0:
            all_records = all_records[:limit]

        with self._lock:
            self.progress["is_running"] = True
            self.progress["total_recordings"] = len(all_records)
            self.progress["processed_recordings"] = 0
            self.progress["total_vectors_indexed"] = 0
            self.progress["completed"] = False
            self.progress["errors"] = []

        logger.info("Starting audio embedding process for %d recordings...", len(all_records))

        for idx, rec in enumerate(all_records, start=1):
            with self._lock:
                self.progress["current_file"] = rec["filename"]

            try:
                indexed = self.embed_recording(rec, vector_router)
                with self._lock:
                    self.progress["processed_recordings"] = idx
                    self.progress["total_vectors_indexed"] += indexed
            except Exception as e:
                logger.error("Failed to embed audio %s: %s", rec["filename"], e)
                with self._lock:
                    self.progress["errors"].append({"file": rec["filename"], "error": str(e)})

            if idx % 25 == 0 or idx == len(all_records):
                logger.info(
                    "Embedding progress: %d/%d files (%d vectors in VectorDBs)",
                    idx, len(all_records), self.progress["total_vectors_indexed"]
                )

        with self._lock:
            self.progress["is_running"] = False
            self.progress["completed"] = True
            self.progress["current_file"] = None

        logger.info(
            "Embedding process completed! Processed %d recordings, indexed %d vectors.",
            self.progress["processed_recordings"], self.progress["total_vectors_indexed"]
        )
        return self.get_status(vector_router)

    def start_background_ingestion(
        self,
        vector_router,
        language: Optional[str] = None,
        limit: Optional[int] = None
    ):
        with self._lock:
            if self.progress["is_running"]:
                return {"message": "Embedding process is already running in background."}

        t = threading.Thread(
            target=self.run_full_ingestion_sync,
            args=(vector_router, language, limit),
            daemon=True
        )
        t.start()
        return {"message": "Background audio embedding process started successfully."}


embedding_service = AudioEmbeddingService()
