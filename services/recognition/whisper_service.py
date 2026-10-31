"""
Singleton Whisper STT Service for high-speed CPU speech transcription.
Uses faster-whisper with INT8 quantization, cached across requests.
"""

import os
from typing import Optional, Dict, Any, List
import numpy as np
from faster_whisper import WhisperModel
from apps.api.app.core.logging import logger


class WhisperService:
    _instance = None
    _model: Optional[WhisperModel] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WhisperService, cls).__new__(cls)
            cls._instance._init_model()
        return cls._instance

    def _init_model(self):
        try:
            model_root = os.path.abspath("models/whisper")
            os.makedirs(model_root, exist_ok=True)
            logger.info("Initializing Faster-Whisper base model (INT8 CPU)...")
            self._model = WhisperModel(
                "base",
                device="cpu",
                compute_type="int8",
                download_root=model_root,
                cpu_threads=4,
                num_workers=1
            )
            logger.info("Faster-Whisper model initialized successfully.")
        except Exception as e:
            logger.error("Failed to load Faster-Whisper model", error=str(e))
            self._model = None

    def transcribe(
        self,
        audio_data,
        language_code: str = "badaga",
        language: Optional[str] = None,
        beam_size: int = 5
    ) -> Dict[str, Any]:
        """
        Transcribes audio data (file path, bytes, or numpy float32 waveform array).
        Uses domain-specific heritage phonetic prompts to guide Whisper away from hallucinating
        foreign languages (like Japanese, Welsh, or Arabic) for short dialect words.
        Returns:
            dict with 'text', 'raw_text', 'language', 'language_prob', 'segments'
        """
        if self._model is None:
            self._init_model()
            if self._model is None:
                return {"text": "", "raw_text": "", "language": "en", "language_prob": 0.0, "segments": []}

        # Domain vocabulary prompts to guide Whisper decoding
        BADAGA_PROMPT = (
            "Badaga language vocabulary: mande, thale, thala, thele, kannu, kanno, kani, mooku, "
            "bayi, bae, bed, kivi, kiwi, kibi, kai, kaalu, hallu, pallu, koodalu, mudi, botte, beralu, monde, "
            "naaku, benna, mokaalu, nenju, koralu, tuti, hani, uguru, paadha, avve, appa, "
            "mane, baa, hogu, kudi, tinnu, ondu, eradu, mooru, naaku, ayidu, aaru, yelu, ettu, hattu. "
            "English and Tamil words: head, eye, nose, mouth, ear, hand, leg, teeth, hair, stomach, "
            "finger, face, tongue, back, knee, chest, neck, lip, forehead, nail, foot, mother, father, "
            "house, come, go, drink, eat, one, two, three, four, five, water, neer. தலை, கண், மூக்கு, வாய், காது, கை, கால்."
        )

        MARWARI_PROMPT = (
            "Marwari dialect vocabulary: maa, bapuji, daadi, dada, bhaa, bhai, jiji, didi, "
            "tabar, paani, pani, mother, father, grandmother, grandfather, brother, sister, baby, water."
        )

        initial_prompt = BADAGA_PROMPT if language_code.lower() == "badaga" else MARWARI_PROMPT

        try:
            kwargs = {
                "beam_size": beam_size,
                "initial_prompt": initial_prompt
            }
            if language:
                kwargs["language"] = language

            segments, info = self._model.transcribe(audio_data, **kwargs)
            seg_list = []
            full_texts = []
            for seg in segments:
                t = seg.text.strip()
                if t:
                    full_texts.append(t)
                    seg_list.append({
                        "start": seg.start,
                        "end": seg.end,
                        "text": t
                    })

            raw_text = " ".join(full_texts).strip()
            detected_lang = info.language

            # Indian subcontinent languages and English are valid;
            # foreign hallucinations (ja, zh, ko, ar, ru, cy, yo, etc.) should be forced to English transliteration
            allowed_dialects = {"en", "ta", "hi", "kn", "te", "ml", "mr", "gu", "pa", "bn", "ur"}
            if not language and detected_lang not in allowed_dialects:
                logger.info(
                    "Whisper misclassified language, re-transcribing with English transliteration",
                    detected_lang=detected_lang,
                    raw_text=raw_text
                )
                kwargs["language"] = "en"
                segments, info = self._model.transcribe(audio_data, **kwargs)
                full_texts = [seg.text.strip() for seg in segments if seg.text.strip()]
                raw_text = " ".join(full_texts).strip()
                detected_lang = "en"

            # Clean and normalize repeated consecutive words (e.g. 'mande mande' -> 'mande')
            words = raw_text.split()
            dedup_words = []
            for w in words:
                cleaned_w = w.strip(".,!?:;\"'()[]{}").lower()
                if not dedup_words or cleaned_w != dedup_words[-1].strip(".,!?:;\"'()[]{}").lower():
                    dedup_words.append(w)
            clean_text = " ".join(dedup_words).strip()

            return {
                "text": clean_text,
                "raw_text": raw_text,
                "language": detected_lang,
                "language_prob": round(info.language_probability, 4),
                "segments": seg_list
            }
        except Exception as e:
            logger.warning("Whisper transcription encountered error", error=str(e))
            return {"text": "", "raw_text": "", "language": "en", "language_prob": 0.0, "segments": []}


whisper_service = WhisperService()
