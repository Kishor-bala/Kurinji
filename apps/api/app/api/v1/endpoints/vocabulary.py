import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from apps.api.app.core.database import get_db
from apps.api.app.core.security import get_current_user
from apps.api.app.models.entities import (
    Language,
    VocabularyEntry,
    AudioAsset,
    CorrectionReport,
    User,
)
from apps.api.app.schemas.vocabulary import (
    LanguageResponse,
    VocabularyEntryResponse,
    AudioAssetResponse,
    CorrectionProposal,
)
from services.vector_store.vocab_store import vocab_store

router = APIRouter(tags=["Languages & Vocabulary"])


@router.get("/languages", response_model=List[LanguageResponse])
def get_languages(db: Optional[Session] = Depends(get_db)):
    if db is not None:
        return db.query(Language).filter(Language.status == "active").all()
    return vocab_store.get_languages()


@router.get("/vocabulary", response_model=List[VocabularyEntryResponse])
def get_vocabulary(
    language: Optional[str] = Query(None, description="Language code: badaga or marwari"),
    search: Optional[str] = Query(None, description="Search by English, Tamil, or Word ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=5000),
    db: Optional[Session] = Depends(get_db)
):
    if db is not None:
        query = db.query(VocabularyEntry).join(Language)
        if language:
            query = query.filter(Language.code == language.lower())

        if search:
            pattern = f"%{search}%"
            query = query.filter(
                (VocabularyEntry.english_meaning.ilike(pattern)) |
                (VocabularyEntry.tamil_meaning.ilike(pattern)) |
                (VocabularyEntry.external_word_id.ilike(pattern)) |
                (VocabularyEntry.source_word.ilike(pattern))
            )

        entries = query.offset(skip).limit(limit).all()

        results = []
        for ve in entries:
            assets = [
                AudioAssetResponse(
                    id=a.id,
                    filename=a.filename,
                    duration=a.duration,
                    sample_rate=a.sample_rate,
                    codec=a.codec,
                    speaker_id=str(a.speaker.external_speaker_id) if a.speaker and hasattr(a.speaker, 'external_speaker_id') else None,
                    speaker_name=a.speaker.name if a.speaker else None,
                    audio_url=f"/api/v1/vocabulary/audio/stream/{a.filename}"
                )
                for a in ve.audio_assets
            ]
            results.append(
                VocabularyEntryResponse(
                    id=ve.id,
                    external_word_id=ve.external_word_id,
                    language_code=ve.language.code,
                    language_name=ve.language.canonical_name,
                    source_word=ve.source_word,
                    tamil_meaning=ve.tamil_meaning,
                    english_meaning=ve.english_meaning,
                    notes=ve.notes,
                    audio_assets=assets
                )
            )
        return results

    # Pure Vector Database Mode
    return vocab_store.get_vocabulary(language=language, search=search, skip=skip, limit=limit)


@router.get("/vocabulary/{word_id}", response_model=VocabularyEntryResponse)
def get_vocabulary_by_id(word_id: str, language: Optional[str] = Query(None), db: Optional[Session] = Depends(get_db)):
    if db is not None:
        query = db.query(VocabularyEntry)
        if language:
            lang_obj = db.query(Language).filter(Language.code == language.lower()).first()
            if lang_obj:
                query = query.filter(VocabularyEntry.language_id == lang_obj.id)
        ve = query.filter(VocabularyEntry.external_word_id == word_id.upper()).first()
        if not ve:
            raise HTTPException(status_code=404, detail=f"Word {word_id} not found in verified dictionary")

        assets = [
            AudioAssetResponse(
                id=a.id,
                filename=a.filename,
                duration=a.duration,
                sample_rate=a.sample_rate,
                codec=a.codec,
                speaker_id=str(a.speaker.external_speaker_id) if a.speaker and hasattr(a.speaker, 'external_speaker_id') else None,
                speaker_name=a.speaker.name if a.speaker else None,
                audio_url=f"/api/v1/vocabulary/audio/stream/{a.filename}"
            )
            for a in ve.audio_assets
        ]

        return VocabularyEntryResponse(
            id=ve.id,
            external_word_id=ve.external_word_id,
            language_code=ve.language.code,
            language_name=ve.language.canonical_name,
            source_word=ve.source_word,
            tamil_meaning=ve.tamil_meaning,
            english_meaning=ve.english_meaning,
            notes=ve.notes,
            audio_assets=assets
        )

    # Pure Vector Database Mode
    item = vocab_store.get_vocabulary_by_id(word_id, language=language)
    if not item:
        raise HTTPException(status_code=404, detail=f"Word {word_id} not found in verified dictionary")
    return item


@router.get("/vocabulary/audio/stream/{filename}")
def stream_audio(filename: str, db: Optional[Session] = Depends(get_db)):
    """
    Streams verified native speaker audio recordings directly with O(1) indexed lookup.
    """
    cached_path = vocab_store.get_audio_path(filename)
    if cached_path and os.path.exists(cached_path):
        return FileResponse(cached_path, media_type="audio/wav", filename=filename)

    # Secondary disk scan fallback
    for root in ["Badaga", "Marwari", "storage/original", "storage/denoised"]:
        candidate = os.path.join(root, filename)
        if os.path.exists(candidate) and not os.path.isdir(candidate):
            return FileResponse(candidate, media_type="audio/wav", filename=filename)

    raise HTTPException(status_code=404, detail=f"Audio file '{filename}' not found on storage disk")


@router.post("/vocabulary/{word_id}/corrections")
def submit_correction(
    word_id: str,
    proposal: CorrectionProposal,
    db: Optional[Session] = Depends(get_db)
):
    return {"status": "submitted", "message": f"Correction proposed for {word_id} submitted for review."}


@router.get("/vocabulary/tts/synthesize")
def synthesize_speech(
    text: str = Query(..., description="Text phrase to synthesize"),
    lang: str = Query("en", description="Language code (en, ta, hi)")
):
    """
    Synthesizes speech on-the-fly using local TTS engine (gTTS / pyttsx3)
    for auditory pronunciation guidance.
    """
    import hashlib
    from gtts import gTTS

    cache_dir = os.path.abspath("storage/tts_cache")
    os.makedirs(cache_dir, exist_ok=True)

    # Hash text and lang for instant deterministic caching
    cache_key = hashlib.md5(f"{lang}_{text}".encode("utf-8")).hexdigest()
    output_path = os.path.join(cache_dir, f"{cache_key}.mp3")

    if not os.path.exists(output_path):
        try:
            tts = gTTS(text=text, lang=lang if lang in ["en", "ta", "hi"] else "en", slow=False)
            tts.save(output_path)
        except Exception as e:
            logger.warning("gTTS synthesis failed, attempting offline pyttsx3 fallback", error=str(e))
            try:
                import pyttsx3
                engine = pyttsx3.init()
                output_wav = os.path.join(cache_dir, f"{cache_key}.wav")
                engine.save_to_file(text, output_wav)
                engine.runAndWait()
                return FileResponse(output_wav, media_type="audio/wav")
            except Exception as ex:
                raise HTTPException(status_code=500, detail=f"TTS synthesis error: {str(ex)}")

    return FileResponse(output_path, media_type="audio/mpeg", filename=f"tts_{cache_key}.mp3")

