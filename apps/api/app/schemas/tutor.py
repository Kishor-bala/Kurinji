from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class TutorChatRequest(BaseModel):
    message: str
    language_code: str
    active_word_id: Optional[str] = None
    lesson_id: Optional[str] = None


class TutorChatResponse(BaseModel):
    message: str
    intent: str
    provider_used: str
    verified_vocabulary: List[Dict[str, Any]]
    examples: List[str]
    uncertainty_note: Optional[str] = None
    requires_teacher_review: bool = False
    audio_url: Optional[str] = None
    audio_assets: List[Dict[str, Any]] = []
    english_tts_url: Optional[str] = None
    tamil_tts_url: Optional[str] = None


class TutorVoiceQueryResponse(BaseModel):
    transcription: str
    detected_language: Optional[str] = None
    message: str
    intent: str
    provider_used: str
    verified_vocabulary: List[Dict[str, Any]]
    examples: List[str] = []
    uncertainty_note: Optional[str] = None
    audio_url: Optional[str] = None
    audio_assets: List[Dict[str, Any]] = []
    english_tts_url: Optional[str] = None
    tamil_tts_url: Optional[str] = None
    response_tts_url: Optional[str] = None
    acoustic_recognition: Optional[Dict[str, Any]] = None


class QuizGenerationRequest(BaseModel):
    language_code: str
    topic: Optional[str] = None
    num_questions: int = 5
    word_ids: Optional[List[str]] = None


class QuizItem(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str
    word_id: str
    english_word: Optional[str] = None
    tamil_meaning: Optional[str] = None
    source_word: Optional[str] = None
    audio_url: Optional[str] = None
    english_tts_url: Optional[str] = None
    audio_assets: List[Dict[str, Any]] = []


class QuizGenerationResponse(BaseModel):
    title: str
    language_code: str
    questions: List[QuizItem]
    grounded_in_database: bool = True
