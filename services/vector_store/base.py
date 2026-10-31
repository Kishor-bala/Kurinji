import uuid
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# Fixed namespace UUID for deterministic vector UUIDv5 generation
VECTOR_NAMESPACE_UUID = uuid.UUID("a3b8905b-1c52-47e2-8cf3-57f369df913d")


def compute_vector_id(
    dataset_version_id: str,
    word_id: str,
    audio_asset_id: str,
    audio_variant: str
) -> str:
    """
    Deterministically computes UUIDv5 to ensure byte-for-byte alignment
    across Zilliz Cloud, Qdrant, and PostgreSQL canonical records.
    """
    key_string = f"{dataset_version_id}:{word_id}:{audio_asset_id}:{audio_variant}"
    return str(uuid.uuid5(VECTOR_NAMESPACE_UUID, key_string))


class VectorRecord(BaseModel):
    vector_id: str
    vector: List[float]
    word_id: str
    language_code: str
    audio_asset_id: str
    recording_id: str
    speaker_id: Optional[str] = None
    segment_start_ms: int
    segment_end_ms: int
    audio_variant: str  # original or denoised
    dataset_version: str
    embedding_model_id: str
    embedding_model_revision: str
    embedding_pipeline_version: str
    sample_rate: int = 16000
    duration_ms: int


class SearchCandidate(BaseModel):
    vector_id: str
    word_id: str
    language_code: str
    audio_asset_id: str
    audio_variant: str
    score: float  # Cosine similarity
    dataset_version: str
    speaker_id: Optional[str] = None
    store_source: str  # "zilliz", "qdrant", "local_fallback"


class BaseVectorStore(ABC):
    @abstractmethod
    def health_check(self) -> bool:
        pass

    @abstractmethod
    def insert_vectors(self, collection_name: str, records: List[VectorRecord]) -> bool:
        pass

    @abstractmethod
    def search(
        self,
        collection_name: str,
        query_vector: List[float],
        top_k: int = 15,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[SearchCandidate]:
        pass
