from typing import Optional, List
from pydantic import BaseModel


class LessonCreate(BaseModel):
    title: str
    description: Optional[str] = None
    language_code: str
    vocabulary_word_ids: List[str]


class LessonItemResponse(BaseModel):
    id: str
    word_id: str
    source_word: Optional[str] = None
    tamil_meaning: str
    english_meaning: str
    audio_url: Optional[str] = None


class LessonResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    language_code: str
    teacher_name: str
    created_at: str
    items: List[LessonItemResponse] = []


class PracticeAttemptCreate(BaseModel):
    vocabulary_entry_id: str
    recognition_result: str
    selected_candidate: Optional[str] = None
    raw_score: Optional[float] = None


class StudentProgressResponse(BaseModel):
    total_practices: int
    successful_attempts: int
    accuracy_percentage: float
    recent_attempts: List[dict] = []
