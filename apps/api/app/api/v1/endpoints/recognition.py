import io
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session

from apps.api.app.core.database import get_db
from apps.api.app.core.security import get_current_user
from apps.api.app.models.entities import User, PracticeAttempt, VocabularyEntry
from services.recognition.engine import RecognitionEngine, RecognitionResult

router = APIRouter(prefix="/recognition", tags=["Voice Recognition"])

recognition_engine = RecognitionEngine()


@router.post("", response_model=RecognitionResult)
async def recognize_audio(
    file: UploadFile = File(..., description="WAV, WEBM, or MP3 audio file"),
    language_code: str = Form(..., description="badaga or marwari"),
    user_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Core speech recognition endpoint.
    Processes audio through dual-path XLS-R 300M acoustic embeddings,
    queries Zilliz Cloud (with Qdrant fallback), and fuses candidates using RRF.
    """
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file provided")

    # Pass in-memory audio bytes to engine
    audio_buffer = io.BytesIO(contents)

    result = recognition_engine.process_and_recognize(
        audio_bytes_or_waveform=audio_buffer,
        language_code=language_code,
        db=db
    )

    # Attach verified native audio playback URL if top word was identified
    if result.top_word_id:
        if db is not None:
            try:
                vocab = db.query(VocabularyEntry).filter(VocabularyEntry.external_word_id == result.top_word_id).first()
                if vocab and vocab.audio_assets:
                    result.audio_asset_url = f"/api/v1/vocabulary/audio/stream/{vocab.audio_assets[0].filename}"

                # Record practice attempt
                if user_id:
                    attempt = PracticeAttempt(
                        user_id=user_id,
                        vocabulary_entry_id=vocab.id if vocab else None,
                        recognition_result=result.decision,
                        selected_candidate=result.top_word_id,
                        raw_score=result.confidence_score,
                        confidence_band=result.decision,
                        feedback_status="completed"
                    )
                    db.add(attempt)
                    db.commit()
            except Exception:
                db = None

        if db is None:
            # Pure Vector Database Mode
            from services.vector_store.vocab_store import vocab_store
            item = vocab_store.get_vocabulary_by_id(result.top_word_id, language=language_code)
            if item and item.get("audio_assets"):
                result.audio_asset_url = f"/api/v1/vocabulary/audio/stream/{item['audio_assets'][0]['filename']}"

    return result


@router.post("/whisper-stt")
async def transcribe_with_local_whisper(
    file: UploadFile = File(..., description="Audio file to transcribe using local Whisper STT")
):
    """
    Transcribes spoken audio using the local Whisper model running on CPU.
    """
    import os
    import tempfile
    from faster_whisper import WhisperModel

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty audio file provided")

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        model_root = os.path.abspath("models/whisper")
        whisper_model = WhisperModel("base", device="cpu", compute_type="int8", download_root=model_root)
        segments, info = whisper_model.transcribe(tmp_path, beam_size=5)
        text_segments = [{"start": seg.start, "end": seg.end, "text": seg.text.strip()} for seg in segments]
        full_text = " ".join([seg["text"] for seg in text_segments])

        return {
            "transcription": full_text,
            "detected_language": info.language,
            "language_probability": round(info.language_probability, 4),
            "duration": round(info.duration, 2),
            "segments": text_segments,
            "model": "faster-whisper-base-local"
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

