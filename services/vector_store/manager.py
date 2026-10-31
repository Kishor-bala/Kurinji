import os
import time
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from apps.api.app.core.config import settings
from apps.api.app.core.logging import logger
from services.vector_store.base import (
    BaseVectorStore,
    VectorRecord,
    SearchCandidate,
)

# PyMilvus / Milvus Lite
try:
    from pymilvus import MilvusClient, DataType
    HAS_PYMILVUS = True
except ImportError:
    HAS_PYMILVUS = False

# Qdrant Client
try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import PointStruct, Distance, VectorParams
    HAS_QDRANT = True
except ImportError:
    HAS_QDRANT = False


class MilvusVectorStore(BaseVectorStore):
    def __init__(
        self,
        uri: Optional[str] = settings.MILVUS_URI,
        user: Optional[str] = settings.MILVUS_USER,
        password: Optional[str] = settings.MILVUS_PASSWORD,
        token: Optional[str] = settings.MILVUS_TOKEN,
        db_name: str = settings.MILVUS_DATABASE,
    ):
        self.uri = uri
        self.user = user
        self.password = password
        self.token = token or (f"{user}:{password}" if user and password else None)
        self.db_name = db_name
        self.client = None
        self._is_connected = False
        self._init_client()

    def _init_client(self):
        if not HAS_PYMILVUS:
            return
        
        # 1. Try Cloud Zilliz if valid endpoint given
        if self.uri and "xxxx" not in self.uri and ("http" in self.uri):
            try:
                self.client = MilvusClient(
                    uri=self.uri,
                    token=self.token,
                    db_name=self.db_name,
                    timeout=3.0
                )
                self.client.list_collections()
                self._is_connected = True
                logger.info("Connected to Zilliz Cloud / Milvus primary vector database")
                return
            except Exception as e:
                logger.warning("Zilliz Cloud remote endpoint not reachable, initializing native Milvus Lite", error=str(e))

        # 2. Native Milvus Lite Vector Database
        try:
            self.client = MilvusClient(uri="./milvus_vectors.db")
            self._is_connected = True
            logger.info("Native Milvus Vector Database active (./milvus_vectors.db)")
        except Exception as e:
            logger.error("Failed to initialize Milvus Vector Database", error=str(e))

    def health_check(self) -> bool:
        if not self.client:
            return False
        try:
            self.client.list_collections()
            return True
        except Exception:
            return False

    def insert_vectors(self, collection_name: str, records: List[VectorRecord], metadata_payload: Optional[List[Dict[str, Any]]] = None) -> bool:
        if not self.client:
            return False
        try:
            if not self.client.has_collection(collection_name):
                self.client.create_collection(
                    collection_name=collection_name,
                    dimension=1024,
                    metric_type="COSINE"
                )
            import hashlib
            data = []
            for idx, r in enumerate(records):
                meta = metadata_payload[idx] if metadata_payload and idx < len(metadata_payload) else {}
                int_id = int(hashlib.md5(str(r.vector_id).encode("utf-8")).hexdigest()[:15], 16)
                item = {
                    "id": int_id,
                    "vector_id": str(r.vector_id),
                    "vector": r.vector,
                    "word_id": r.word_id,
                    "language_code": r.language_code,
                    "audio_asset_id": r.audio_asset_id,
                    "recording_id": r.recording_id,
                    "speaker_id": r.speaker_id or "",
                    "audio_variant": r.audio_variant,
                    "dataset_version": r.dataset_version,
                    **meta
                }
                data.append(item)
            try:
                self.client.insert(collection_name=collection_name, data=data)
            except Exception as ins_err:
                # If collection expects string ID instead of int64
                if "string" in str(ins_err).lower() or "varchar" in str(ins_err).lower():
                    for it in data:
                        it["id"] = str(it["vector_id"])
                    self.client.insert(collection_name=collection_name, data=data)
                else:
                    raise ins_err
            return True
        except Exception as e:
            logger.error("Milvus vector insertion failed", error=str(e))
            return False

    def search(
        self,
        collection_name: str,
        query_vector: List[float],
        top_k: int = 15,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[SearchCandidate]:
        if not self.client or not self.client.has_collection(collection_name):
            return []

        filter_expr = ""
        if filters:
            parts = [f'{k} == "{v}"' for k, v in filters.items()]
            filter_expr = " and ".join(parts)

        try:
            self.client.load_collection(collection_name)
        except Exception:
            pass

        res = self.client.search(
            collection_name=collection_name,
            data=[query_vector],
            limit=top_k,
            filter=filter_expr if filter_expr else None,
            output_fields=[
                "vector_id", "word_id", "language_code", "audio_asset_id", "audio_variant",
                "dataset_version", "speaker_id", "english_meaning", "tamil_meaning", "source_word"
            ]
        )

        candidates = []
        for hit in res[0]:
            entity = hit.get("entity", {})
            v_id = str(entity.get("vector_id") or hit.get("id"))
            candidates.append(
                SearchCandidate(
                    vector_id=v_id,
                    word_id=entity.get("word_id"),
                    language_code=entity.get("language_code"),
                    audio_asset_id=entity.get("audio_asset_id"),
                    audio_variant=entity.get("audio_variant"),
                    score=float(hit.get("distance", 0.0)),
                    dataset_version=entity.get("dataset_version"),
                    speaker_id=entity.get("speaker_id"),
                    store_source="milvus"
                )
            )
        return candidates


class QdrantVectorStore(BaseVectorStore):
    _shared_client = None

    def __init__(
        self,
        url: Optional[str] = settings.QDRANT_URL,
        api_key: Optional[str] = settings.QDRANT_API_KEY
    ):
        self.url = url
        self.api_key = api_key
        self.client = None
        self._init_client()

    def _init_client(self):
        if QdrantVectorStore._shared_client is not None:
            self.client = QdrantVectorStore._shared_client
            return

        if not HAS_QDRANT:
            return

        # 1. Try Remote Qdrant Cloud if reachable
        if self.url:
            try:
                remote_client = QdrantClient(url=self.url, api_key=self.api_key, timeout=3.0, check_compatibility=False)
                remote_client.get_collections()
                self.client = remote_client
                QdrantVectorStore._shared_client = remote_client
                logger.info("Connected to Qdrant Cloud vector database")
                return
            except Exception as e:
                logger.warning("Remote Qdrant Cloud connection reset, initializing native Qdrant VectorDB", error=str(e))

        # 2. Native Persistent Qdrant VectorDB
        try:
            os.makedirs("./qdrant_vectors", exist_ok=True)
            self.client = QdrantClient(path="./qdrant_vectors")
            QdrantVectorStore._shared_client = self.client
            logger.info("Native Qdrant Vector Database active (./qdrant_vectors)")
        except Exception as e:
            logger.warning("Storage folder lock or error in Qdrant, using memory fallback", error=str(e))
            try:
                self.client = QdrantClient(":memory:")
                QdrantVectorStore._shared_client = self.client
            except Exception as ex:
                logger.error("Failed to initialize Qdrant Vector Database", error=str(ex))


    def health_check(self) -> bool:
        if not self.client:
            return False
        try:
            self.client.get_collections()
            return True
        except Exception:
            return False

    def insert_vectors(self, collection_name: str, records: List[VectorRecord], metadata_payload: Optional[List[Dict[str, Any]]] = None) -> bool:
        if not self.client:
            return False
        try:
            collections = [c.name for c in self.client.get_collections().collections]
            if collection_name not in collections:
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
                )
            points = []
            for idx, r in enumerate(records):
                meta = metadata_payload[idx] if metadata_payload and idx < len(metadata_payload) else {}
                points.append(
                    PointStruct(
                        id=r.vector_id,
                        vector=r.vector,
                        payload={
                            "word_id": r.word_id,
                            "language_code": r.language_code,
                            "audio_asset_id": r.audio_asset_id,
                            "recording_id": r.recording_id,
                            "speaker_id": r.speaker_id,
                            "audio_variant": r.audio_variant,
                            "dataset_version": r.dataset_version,
                            **meta
                        }
                    )
                )
            self.client.upsert(collection_name=collection_name, points=points)
            return True
        except Exception as e:
            logger.error("Qdrant vector upsert failed", error=str(e))
            return False

    def search(
        self,
        collection_name: str,
        query_vector: List[float],
        top_k: int = 15,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[SearchCandidate]:
        if not self.client:
            return []
        try:
            if hasattr(self.client, "query_points"):
                res_obj = self.client.query_points(
                    collection_name=collection_name,
                    query=query_vector,
                    limit=top_k
                )
                results = res_obj.points
            elif hasattr(self.client, "search"):
                results = self.client.search(
                    collection_name=collection_name,
                    query_vector=query_vector,
                    limit=top_k
                )
            else:
                results = []
            candidates = []
            for hit in results:
                payload = hit.payload or {}
                candidates.append(
                    SearchCandidate(
                        vector_id=str(hit.id),
                        word_id=payload.get("word_id"),
                        language_code=payload.get("language_code"),
                        audio_asset_id=payload.get("audio_asset_id"),
                        audio_variant=payload.get("audio_variant"),
                        score=float(hit.score),
                        dataset_version=payload.get("dataset_version"),
                        speaker_id=payload.get("speaker_id"),
                        store_source="qdrant"
                    )
                )
            return candidates
        except Exception as e:
            logger.warning("Qdrant search error", error=str(e))
            return []


class VectorStoreRouter:
    """
    Manages vector retrieval across Milvus and Qdrant.
    No SQLite used: all vectors and payloads persist natively in the vector databases.
    """
    def __init__(self):
        self.primary = MilvusVectorStore()
        self.fallback = QdrantVectorStore()

    def insert_vectors_dual(
        self,
        collection_name: str,
        records: List[VectorRecord],
        metadata_payload: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, bool]:
        results = {"milvus": False, "qdrant": False}

        # 1. Primary: Milvus / Zilliz
        try:
            results["milvus"] = self.primary.insert_vectors(collection_name, records, metadata_payload)
        except Exception as e:
            logger.warning("Milvus insert exception", error=str(e))

        # 2. Fallback: Qdrant
        try:
            results["qdrant"] = self.fallback.insert_vectors(collection_name, records, metadata_payload)
        except Exception as e:
            logger.warning("Qdrant insert exception", error=str(e))

        return results

    def search(
        self,
        collection_name: str,
        query_vector: List[float],
        top_k: int = 15,
        filters: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[SearchCandidate], str]:
        # Try Primary: Milvus
        if self.primary.health_check():
            try:
                results = self.primary.search(collection_name, query_vector, top_k, filters)
                if results:
                    return results, "milvus"
            except Exception as e:
                logger.warning("Milvus search query failed, checking Qdrant fallback", error=str(e))

        # Try Fallback: Qdrant
        if self.fallback.health_check():
            try:
                results = self.fallback.search(collection_name, query_vector, top_k, filters)
                if results:
                    return results, "qdrant"
            except Exception as e:
                logger.warning("Qdrant query failed", error=str(e))

        return [], "none"
