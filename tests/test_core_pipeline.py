import pytest
import numpy as np
import io
import soundfile as sf
from fastapi.testclient import TestClient

from apps.api.app.main import app
from services.vector_store.base import compute_vector_id, VECTOR_NAMESPACE_UUID
from services.audio.preprocessing import AudioPreprocessor, AudioValidationError
from services.recognition.engine import RecognitionEngine, AlternativeCandidate
from services.vector_store.base import SearchCandidate


client = TestClient(app)


def test_vector_id_generation_deterministic():
    """Verifies that vector UUIDv5 is 100% deterministic and reproducible."""
    v1 = compute_vector_id("v1.0.0", "W0001", "asset_123", "original")
    v2 = compute_vector_id("v1.0.0", "W0001", "asset_123", "original")
    v_diff = compute_vector_id("v1.0.0", "W0001", "asset_123", "denoised")

    assert v1 == v2
    assert v1 != v_diff
    assert len(v1) == 36


def test_audio_validation_silence_rejection():
    """Verifies that pure silence is rejected safely without silent errors."""
    preprocessor = AudioPreprocessor()
    silent_audio = np.zeros(16000, dtype=np.float32)

    buf = io.BytesIO()
    sf.write(buf, silent_audio, 16000, format="WAV")
    buf.seek(0)

    with pytest.raises(AudioValidationError, match="contains only silence"):
        preprocessor.load_and_validate_audio(buf)


def test_audio_vad_segmentation_bounds():
    """Verifies that speech segments are strictly bounded between 300ms and 4000ms."""
    preprocessor = AudioPreprocessor(min_utterance_ms=300, max_utterance_ms=4000)
    sr = 16000
    # Create 3-second waveform with a 1-second sine wave burst at 440 Hz
    t = np.linspace(0, 1.0, sr, endpoint=False)
    tone = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    silence = np.zeros(int(sr * 0.5), dtype=np.float32)

    combined = np.concatenate([silence, tone, silence])
    segments = preprocessor.detect_speech_segments(combined, sr)

    assert len(segments) >= 1
    start_ms, end_ms = segments[0]
    duration_ms = end_ms - start_ms
    assert duration_ms >= 300
    assert duration_ms <= 4000


def test_rrf_rank_fusion_ranking():
    """Tests Reciprocal Rank Fusion aggregation across original and denoised candidate lists."""
    engine = RecognitionEngine()

    orig = [
        SearchCandidate(
            vector_id="v1", word_id="W0001", language_code="badaga",
            audio_asset_id="a1", audio_variant="original", score=0.88,
            dataset_version="v1.0.0", store_source="zilliz"
        ),
        SearchCandidate(
            vector_id="v2", word_id="W0002", language_code="badaga",
            audio_asset_id="a2", audio_variant="original", score=0.82,
            dataset_version="v1.0.0", store_source="zilliz"
        ),
    ]

    denoised = [
        SearchCandidate(
            vector_id="v3", word_id="W0001", language_code="badaga",
            audio_asset_id="a1", audio_variant="denoised", score=0.89,
            dataset_version="v1.0.0", store_source="zilliz"
        ),
        SearchCandidate(
            vector_id="v4", word_id="W0003", language_code="badaga",
            audio_asset_id="a3", audio_variant="denoised", score=0.81,
            dataset_version="v1.0.0", store_source="zilliz"
        ),
    ]

    fused = engine.compute_rrf(orig, denoised)
    # W0001 is ranked #1 in both lists, so its fused score must be highest
    top_w_id, top_score, best_raw, _ = fused[0]
    assert top_w_id == "W0001"
    assert top_score > fused[1][1]


def test_api_health_endpoint():
    """Verifies that the /health and /admin/system/health endpoints return valid JSON."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

    admin_health = client.get("/api/v1/admin/system/health")
    assert admin_health.status_code == 200
    data = admin_health.json()
    assert "components" in data
    assert data["components"]["database"]["status"] == "up"


def test_api_vocabulary_list():
    """Verifies that canonical vocabulary can be retrieved via the REST API."""
    response = client.get("/api/v1/vocabulary?limit=5")
    assert response.status_code == 200
    items = response.json()
    assert isinstance(items, list)
    if len(items) > 0:
        entry = items[0]
        assert "external_word_id" in entry
        assert "tamil_meaning" in entry
        assert "english_meaning" in entry
