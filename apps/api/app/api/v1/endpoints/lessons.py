from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from apps.api.app.core.database import get_db
from apps.api.app.core.security import get_current_user, RoleChecker
from apps.api.app.models.entities import (
    Lesson,
    LessonItem,
    VocabularyEntry,
    Language,
    User,
    PracticeAttempt,
)
from apps.api.app.schemas.lessons import (
    LessonCreate,
    LessonResponse,
    LessonItemResponse,
    PracticeAttemptCreate,
    StudentProgressResponse,
)

router = APIRouter(tags=["Lessons & Student Learning"])


@router.get("/lessons", response_model=List[LessonResponse])
def list_lessons(language: Optional[str] = None, db: Optional[Session] = Depends(get_db)):
    if db is not None:
        try:
            query = db.query(Lesson)
            if language:
                query = query.join(Language).filter(Language.code == language.lower())
            lessons = query.all()

            resp = []
            for l in lessons:
                items = []
                for li in l.items:
                    ve = li.vocabulary_entry
                    audio_url = f"/api/v1/vocabulary/audio/stream/{ve.audio_assets[0].filename}" if ve.audio_assets else None
                    items.append(
                        LessonItemResponse(
                            id=li.id,
                            word_id=ve.external_word_id,
                            source_word=ve.source_word,
                            tamil_meaning=ve.tamil_meaning,
                            english_meaning=ve.english_meaning,
                            audio_url=audio_url
                        )
                    )
                resp.append(
                    LessonResponse(
                        id=l.id,
                        title=l.title,
                        description=l.description,
                        language_code=l.language.code if hasattr(l, "language") and l.language else "",
                        teacher_name=l.teacher.display_name if l.teacher else "Native Teacher",
                        created_at=str(l.created_at),
                        items=items
                    )
                )
            return resp
        except Exception:
            db = None

    # Pure Vector Database Mode
    from services.vector_store.vocab_store import vocab_store
    target_langs = [language.lower()] if language else ["badaga", "marwari"]
    generated_lessons = []

    for lang_code in target_langs:
        lang_title = "Badaga" if lang_code == "badaga" else "Marwari"
        vocab_items = vocab_store.get_vocabulary(language=lang_code, limit=15)
        if vocab_items:
            items_resp = [
                LessonItemResponse(
                    id=it["id"],
                    word_id=it["external_word_id"],
                    source_word=it.get("source_word"),
                    tamil_meaning=it["tamil_meaning"],
                    english_meaning=it["english_meaning"],
                    audio_url=it["audio_assets"][0]["audio_url"] if it.get("audio_assets") else None
                )
                for it in vocab_items[:8]
            ]
            generated_lessons.append(
                LessonResponse(
                    id=f"lesson_{lang_code}_foundations",
                    title=f"Core {lang_title} Foundational Vocabulary",
                    description=f"Essential vocabulary and native phonetic pronunciation for {lang_title}.",
                    language_code=lang_code,
                    teacher_name="Native Elder & Linguistic Archive",
                    created_at="2026-10-30",
                    items=items_resp
                )
            )

    return generated_lessons



@router.post("/lessons", response_model=LessonResponse)
def create_lesson(
    lesson_in: LessonCreate,
    current_user: User = Depends(RoleChecker(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    lang_obj = db.query(Language).filter(Language.code == lesson_in.language_code.lower()).first()
    if not lang_obj:
        raise HTTPException(status_code=400, detail="Language not found")

    lesson = Lesson(
        title=lesson_in.title,
        description=lesson_in.description,
        language_id=lang_obj.id,
        teacher_id=current_user.id
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)

    # Attach items
    vocab_records = db.query(VocabularyEntry).filter(
        VocabularyEntry.language_id == lang_obj.id,
        VocabularyEntry.external_word_id.in_(lesson_in.vocabulary_word_ids)
    ).all()

    items_resp = []
    for idx, v in enumerate(vocab_records):
        item = LessonItem(
            lesson_id=lesson.id,
            vocabulary_entry_id=v.id,
            order_index=idx
        )
        db.add(item)
        audio_url = f"/api/v1/vocabulary/audio/stream/{v.audio_assets[0].filename}" if v.audio_assets else None
        items_resp.append(
            LessonItemResponse(
                id=str(idx),
                word_id=v.external_word_id,
                source_word=v.source_word,
                tamil_meaning=v.tamil_meaning,
                english_meaning=v.english_meaning,
                audio_url=audio_url
            )
        )
    db.commit()

    return LessonResponse(
        id=lesson.id,
        title=lesson.title,
        description=lesson.description,
        language_code=lang_obj.code,
        teacher_name=current_user.display_name,
        created_at=str(lesson.created_at),
        items=items_resp
    )


@router.get("/students/me/progress", response_model=StudentProgressResponse)
def get_student_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attempts = db.query(PracticeAttempt).filter(PracticeAttempt.user_id == current_user.id).all()
    total = len(attempts)
    successful = sum(1 for a in attempts if a.recognition_result == "ACCEPTED")
    acc = (successful / total * 100.0) if total > 0 else 0.0

    recent = [
        {
            "id": a.id,
            "word_id": a.selected_candidate,
            "result": a.recognition_result,
            "score": a.raw_score,
            "time": str(a.attempt_time)
        }
        for a in attempts[-10:]
    ]

    return StudentProgressResponse(
        total_practices=total,
        successful_attempts=successful,
        accuracy_percentage=round(acc, 1),
        recent_attempts=recent
    )
