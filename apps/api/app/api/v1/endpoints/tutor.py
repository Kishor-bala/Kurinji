import os
import io
import random
import tempfile
import urllib.parse
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from apps.api.app.core.database import get_db
from apps.api.app.models.entities import VocabularyEntry, Language
from apps.api.app.schemas.tutor import (
    TutorChatRequest,
    TutorChatResponse,
    TutorVoiceQueryResponse,
    QuizGenerationRequest,
    QuizGenerationResponse,
    QuizItem,
)
from services.tutor.service import TutorService
from services.recognition.engine import RecognitionEngine
from services.recognition.lexical_matcher import lexical_matcher
from apps.api.app.core.logging import logger

router = APIRouter(prefix="/tutor", tags=["AI Teaching Assistant"])

tutor_service = TutorService()
recognition_engine = RecognitionEngine()


@router.post("/chat", response_model=TutorChatResponse)
def tutor_chat(request: TutorChatRequest, db: Optional[Session] = Depends(get_db)):
    """
    Interactive AI tutor session grounded strictly in verified canonical records.
    Uses Gemini (Primary), Groq (Secondary Fallback), and local Ollama.
    """
    res = tutor_service.chat_with_tutor(
        user_message=request.message,
        language_code=request.language_code,
        db=db,
        active_word_id=request.active_word_id,
        lesson_id=request.lesson_id
    )

    return TutorChatResponse(
        message=res.message,
        intent=res.intent,
        provider_used=res.provider_used,
        verified_vocabulary=res.verified_vocabulary,
        examples=res.examples,
        uncertainty_note=res.uncertainty_note,
        requires_teacher_review=res.requires_teacher_review,
        audio_url=res.audio_url,
        audio_assets=res.audio_assets,
        english_tts_url=res.english_tts_url,
        tamil_tts_url=res.tamil_tts_url
    )


@router.post("/voice-query", response_model=TutorVoiceQueryResponse)
async def tutor_voice_query(
    file: UploadFile = File(..., description="Audio recording of spoken question or heritage word"),
    language_code: str = Form("badaga", description="badaga or marwari"),
    spoken_lang: Optional[str] = Form(None, description="Optional language hint (en, ta)"),
    db: Optional[Session] = Depends(get_db)
):
    """
    Multimodal Voice AI Tutor Endpoint.
    Transcribes spoken voice using local Whisper STT, or detects acoustic heritage words
    via XLS-R 300M, retrieves verified canonical vocabulary and native audio,
    and synthesizes speech response.
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty audio recording provided")

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    detected_lang = spoken_lang or "en"
    transcription = ""
    acoustic_rec = None

    try:
        # 1. Run Hybrid Voice Recognition (Whisper STT + Lexical Grounding + XLS-R VectorDB)
        rec_result = recognition_engine.process_and_recognize(
            audio_bytes_or_waveform=io.BytesIO(contents),
            language_code=language_code,
            db=db
        )
        if rec_result:
            acoustic_rec = rec_result.model_dump()
            transcription = rec_result.transcription or ""

        # 2. Check if user spoke a conversational question or a single vocabulary word
        t_low = transcription.lower().strip()
        question_indicators = [
            "what", "how", "why", "where", "tell me", "meaning", "pronounce",
            "explain", "say", "சொல்", "என்ன", "எப்படி", "அர்த்தம்", "விளக்கு", "படகில்", "படக"
        ]
        is_conversational_question = any(q in t_low for q in question_indicators) or len(t_low.split()) >= 3

        active_word = None
        user_spoken_display = transcription or "Spoken voice query"

        if is_conversational_question and transcription:
            # Conversational Question: extract target vocabulary keyword from transcribed question
            # NEVER let raw acoustic vector similarity of English sentences override the student's actual question!
            query_text = transcription
            user_spoken_display = transcription
            cand_match = lexical_matcher.find_match(transcription, language_code=language_code)
            if cand_match and cand_match[0]:
                active_word = cand_match[0]["external_word_id"]
                eng_m = cand_match[0]["english_meaning"]
                tam_m = cand_match[0]["tamil_meaning"]
                query_text = (
                    f"{transcription}. Specifically explain the {language_code.capitalize()} word for "
                    f"'{eng_m}' (Tamil: '{tam_m}', Word ID: {active_word}) and its native pronunciation."
                )
        elif rec_result and rec_result.decision == "ACCEPTED" and rec_result.top_word_id:
            # Single spoken heritage word or recognized term
            active_word = rec_result.top_word_id
            eng_m = rec_result.english_meaning or ""
            tam_m = rec_result.tamil_meaning or ""
            spoken_term = transcription if transcription else eng_m
            user_spoken_display = f"{spoken_term} ({eng_m} / {tam_m})"
            query_text = (
                f"The student asked about the {language_code.capitalize()} word for '{eng_m}' "
                f"(Tamil: '{tam_m}', Word ID: {active_word}). "
                f"Explain its native pronunciation, meaning, and cultural usage."
            )
        else:
            cand_match = lexical_matcher.find_match(transcription, language_code=language_code) if transcription else None
            if cand_match and cand_match[0]:
                active_word = cand_match[0]["external_word_id"]
                eng_m = cand_match[0]["english_meaning"]
                tam_m = cand_match[0]["tamil_meaning"]
                user_spoken_display = f"{transcription} ({eng_m} / {tam_m})"
                query_text = (
                    f"The student asked about the {language_code.capitalize()} word for '{eng_m}' "
                    f"(Tamil: '{tam_m}', Word ID: {active_word}). "
                    f"Explain its native pronunciation, meaning, and cultural usage."
                )
            else:
                query_text = transcription or f"Hello! Please tell me about {language_code.capitalize()} vocabulary."
                user_spoken_display = transcription or "Spoken voice query"

        # 3. Query AI Tutor with strictly grounded canonical context
        res = tutor_service.chat_with_tutor(
            user_message=query_text,
            language_code=language_code,
            active_word_id=active_word,
            db=db
        )

        # 4. Generate response TTS audio URL for verbal explanation
        is_tamil = any('\u0B80' <= c <= '\u0BFF' for c in res.message)
        tts_lang = "ta" if is_tamil else "en"
        short_text = res.message[:300].replace("\n", " ").strip()
        response_tts_url = f"/api/v1/vocabulary/tts/synthesize?text={urllib.parse.quote(short_text)}&lang={tts_lang}"

        return TutorVoiceQueryResponse(
            transcription=user_spoken_display,
            detected_language=detected_lang,
            message=res.message,
            intent=res.intent,
            provider_used=res.provider_used,
            verified_vocabulary=res.verified_vocabulary,
            examples=res.examples,
            uncertainty_note=res.uncertainty_note,
            audio_url=res.audio_url,
            audio_assets=res.audio_assets,
            english_tts_url=res.english_tts_url,
            tamil_tts_url=res.tamil_tts_url,
            response_tts_url=response_tts_url,
            acoustic_recognition=acoustic_rec
        )
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


@router.post("/quiz-generation", response_model=QuizGenerationResponse)
def generate_quiz(request: QuizGenerationRequest, db: Optional[Session] = Depends(get_db)):
    """
    Generates a multiple-choice vocabulary quiz strictly using verified vocabulary from Vector/Canonical Store.
    """
    lang_code = request.language_code.lower().strip()
    lang_name = "Badaga" if lang_code == "badaga" else "Marwari"

    all_vocab = []
    if db is not None:
        try:
            lang_obj = db.query(Language).filter(Language.code == lang_code).first()
            if lang_obj:
                query = db.query(VocabularyEntry).filter(VocabularyEntry.language_id == lang_obj.id)
                if request.word_ids:
                    query = query.filter(VocabularyEntry.external_word_id.in_(request.word_ids))
                rows = query.all()
                all_vocab = [
                    {
                        "id": r.id,
                        "external_word_id": r.external_word_id,
                        "english_meaning": r.english_meaning,
                        "tamil_meaning": r.tamil_meaning,
                        "source_word": r.source_word
                    }
                    for r in rows
                ]
        except Exception:
            db = None

    if db is None:
        # Pure Vector Database Mode
        from services.vector_store.vocab_store import vocab_store
        items = vocab_store.get_vocabulary(language=lang_code, limit=200)
        if request.word_ids:
            items = [it for it in items if it.get("external_word_id") in request.word_ids]
        all_vocab = items

    if len(all_vocab) < 4:
        raise HTTPException(status_code=400, detail="Insufficient vocabulary entries to generate 4-option multiple choice questions")

    # Sample questions
    num_q = min(request.num_questions, len(all_vocab))
    selected_targets = random.sample(all_vocab, num_q)

    quiz_items = []
    import urllib.parse

    for target in selected_targets:
        target_id = target.get("id") or target.get("external_word_id")
        distractors = [v for v in all_vocab if (v.get("id") or v.get("external_word_id")) != target_id]
        chosen_distractors = random.sample(distractors, 3)

        options = [target["tamil_meaning"]] + [d["tamil_meaning"] for d in chosen_distractors]
        random.shuffle(options)

        spelling_txt = f" ('{target.get('source_word')}')" if target.get("source_word") else ""
        eng_word = target.get("english_meaning", "")
        q_text = f"What is the Tamil meaning for the {lang_name} word '{eng_word}'{spelling_txt} ({target['external_word_id']})?"

        # Extract native speaker audio if available
        assets = target.get("audio_assets") or []
        first_audio = assets[0]["audio_url"] if assets else None
        encoded_eng = urllib.parse.quote(eng_word)
        eng_tts = f"/api/v1/vocabulary/tts/synthesize?text={encoded_eng}&lang=en"

        quiz_items.append(
            QuizItem(
                question=q_text,
                options=options,
                correct_answer=target["tamil_meaning"],
                explanation=f"'{eng_word}' in {lang_name} translates to Tamil '{target['tamil_meaning']}'.",
                word_id=target["external_word_id"],
                english_word=eng_word,
                tamil_meaning=target["tamil_meaning"],
                source_word=target.get("source_word"),
                audio_url=first_audio,
                english_tts_url=eng_tts,
                audio_assets=assets
            )
        )

    return QuizGenerationResponse(
        title=f"{lang_name} Vocabulary Practice Quiz",
        language_code=request.language_code,
        questions=quiz_items,
        grounded_in_database=True
    )


