from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class LanguageResponse(BaseModel):
    id: str
    code: str
    canonical_name: str
    alternate_names: Optional[str] = None
    status: str
    word_count: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class AudioAssetResponse(BaseModel):
    id: str
    filename: str
    duration: float
    sample_rate: int
    codec: str
    speaker_id: Optional[str] = None
    speaker_name: Optional[str] = None
    audio_url: str

    model_config = ConfigDict(from_attributes=True)


class VocabularyEntryResponse(BaseModel):
    id: str
    external_word_id: str
    language_code: str
    language_name: str
    source_word: Optional[str] = None
    tamil_meaning: str
    tamil_syllables: Optional[str] = None
    tamil_phonetics: Optional[str] = None
    english_meaning: str
    category: Optional[str] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None
    audio_assets: List[AudioAssetResponse] = []

    model_config = ConfigDict(from_attributes=True)


class CorrectionProposal(BaseModel):
    proposed_meaning: str
    reason: Optional[str] = None
