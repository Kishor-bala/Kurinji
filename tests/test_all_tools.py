import io
import os
import wave
import numpy as np
import pytest
from fastapi.testclient import TestClient

from apps.api.app.main import app

client = TestClient(app)


def generate_dummy_wav_bytes(duration_sec=1.5, sample_rate=16000, freq=440.0):
    t = np.linspace(0, duration_sec, int(sample_rate * duration_sec), endpoint=False)
    # Sine wave with gentle speech-like envelope
    audio = 0.5 * np.sin(2 * np.pi * freq * t)
    audio = (audio * 32767).astype(np.int16)
    
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio.tobytes())
    buffer.seek(0)
    return buffer.read()


def test_01_health_and_languages():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] in ["ok", "healthy"]

    lang_res = client.get("/api/v1/languages")
    assert lang_res.status_code == 200
    langs = lang_res.json()
    assert len(langs) >= 2
    codes = [l["code"] for l in langs]
    assert "badaga" in codes
    assert "marwari" in codes


def test_02_vocabulary_pure_vectordb():
    # Test Badaga vocabulary retrieval
    res_b = client.get("/api/v1/vocabulary?language=badaga&limit=10")
    assert res_b.status_code == 200
    items_b = res_b.json()
    assert len(items_b) > 0
    assert items_b[0]["language_code"] == "badaga"
    first_id = items_b[0]["external_word_id"]

    # Test single vocabulary retrieval
    res_single = client.get(f"/api/v1/vocabulary/{first_id}")
    assert res_single.status_code == 200
    assert res_single.json()["external_word_id"] == first_id

    # Test Marwari vocabulary retrieval
    res_m = client.get("/api/v1/vocabulary?language=marwari&limit=10")
    assert res_m.status_code == 200
    items_m = res_m.json()
    assert len(items_m) > 0
    assert items_m[0]["language_code"] == "marwari"


def test_03_tts_synthesis():
    # Synthesize speech using local TTS
    res = client.get("/api/v1/vocabulary/tts/synthesize?text=Badaga&lang=en")
    assert res.status_code == 200
    assert res.headers["content-type"] in ["audio/mpeg", "audio/wav"]
    assert len(res.content) > 100


def test_04_tutor_chat_and_quiz():
    # Quiz Generation test
    quiz_res = client.post("/api/v1/tutor/quiz-generation", json={
        "language_code": "badaga",
        "num_questions": 3
    })
    assert quiz_res.status_code == 200
    quiz_data = quiz_res.json()
    assert len(quiz_data["questions"]) == 3
    assert len(quiz_data["questions"][0]["options"]) == 4

    # Tutor Chat test (Gemini / Groq / local router)
    chat_res = client.post("/api/v1/tutor/chat", json={
        "message": "What does Badaga word BDG_001 mean?",
        "language_code": "badaga"
    })
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert "message" in chat_data
    assert chat_data["provider_used"] in ["gemini", "groq", "ollama", "offline_fallback"]


def test_05_whisper_stt():
    wav_bytes = generate_dummy_wav_bytes(duration_sec=1.0)
    files = {"file": ("test.wav", wav_bytes, "audio/wav")}
    res = client.post("/api/v1/recognition/whisper-stt", files=files)
    assert res.status_code == 200
    data = res.json()
    assert "transcription" in data
    assert "model" in data


def test_06_recognition_xlsr_300m():
    # Test recognition endpoint with dual-path XLS-R 300M acoustic embeddings
    wav_bytes = generate_dummy_wav_bytes(duration_sec=1.5)
    files = {"file": ("audio_sample.wav", wav_bytes, "audio/wav")}
    data = {"language_code": "badaga"}
    res = client.post("/api/v1/recognition", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()
    assert "decision" in res_data
    assert res_data["decision"] in ["ACCEPTED", "AMBIGUOUS", "UNKNOWN", "RETRY_REQUIRED"]
