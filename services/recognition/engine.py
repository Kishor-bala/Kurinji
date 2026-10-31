"""
Hybrid Speech Recognition Engine.
Combines Dual-Path Acoustic Vector Retrieval (XLS-R 300M in Milvus & Qdrant),
Local Faster-Whisper Speech-to-Text, Multilingual Phonetic Grounding,
and Reciprocal Rank Fusion (RRF) for high-accuracy heritage word identification.
"""

from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict
from sqlalchemy.orm import Session
from pydantic import BaseModel

from apps.api.app.core.config import settings
from apps.api.app.core.logging import logger
from apps.api.app.models.entities import VocabularyEntry, Language, AudioAsset
from services.audio.preprocessing import AudioPreprocessor, AudioValidationError
from services.embeddings.xlsr_encoder import XLSREncoder
from services.vector_store.manager import VectorStoreRouter
from services.vector_store.base import SearchCandidate
from services.vector_store.vocab_store import vocab_store
from services.recognition.whisper_service import whisper_service
from services.recognition.lexical_matcher import lexical_matcher


class AlternativeCandidate(BaseModel):
    word_id: str
    source_word: Optional[str] = None
    tamil_meaning: str
    english_meaning: str
    fusion_score: float
    raw_similarity: float


class RecognitionResult(BaseModel):
    decision: str  # ACCEPTED, AMBIGUOUS, UNKNOWN, RETRY_REQUIRED
    top_word_id: Optional[str] = None
    source_word: Optional[str] = None
    tamil_meaning: Optional[str] = None
    english_meaning: Optional[str] = None
    confidence_score: float = 0.0
    fusion_score: float = 0.0
    alternatives: List[AlternativeCandidate] = []
    store_used: str = "zilliz"
    guidance: Optional[str] = None
    audio_asset_url: Optional[str] = None
    transcription: Optional[str] = None


class RecognitionEngine:
    def __init__(self):
        self.preprocessor = AudioPreprocessor()
        self.encoder = XLSREncoder()
        self.vector_router = VectorStoreRouter()
        self.rrf_k = settings.RRF_K
        self.accept_threshold = settings.CONFIDENCE_ACCEPT_THRESHOLD
        self.ambiguous_delta = settings.CONFIDENCE_AMBIGUOUS_DELTA

    def compute_rrf(
        self,
        orig_orig_candidates: List[SearchCandidate],
        orig_den_candidates: List[SearchCandidate],
        den_orig_candidates: List[SearchCandidate],
        den_den_candidates: List[SearchCandidate],
    ) -> List[Tuple[str, float, float, SearchCandidate]]:
        """
        4-Way Cross-Path Reciprocal Rank Fusion comparing user voice (raw & denoised)
        against both project original and denoised audio representations.
        Deduplicates candidate ranks so each word earns rank bonuses based on
        consistent multi-reference acoustic alignment.
        """
        all_lists = [
            ("orig_orig", orig_orig_candidates),
            ("orig_den", orig_den_candidates),
            ("den_orig", den_orig_candidates),
            ("den_den", den_den_candidates),
        ]

        word_best_ranks = defaultdict(dict)
        word_best_raw = defaultdict(float)
        word_best_candidate = {}
        all_words = set()

        for list_name, cands in all_lists:
            for rank, cand in enumerate(cands, start=1):
                w = cand.word_id
                if not w:
                    continue
                all_words.add(w)
                if list_name not in word_best_ranks[w]:
                    word_best_ranks[w][list_name] = rank
                if cand.score > word_best_raw[w]:
                    word_best_raw[w] = cand.score
                    word_best_candidate[w] = cand

        max_single_rrf = 1.0 / (self.rrf_k + 1)
        max_possible_rrf = 4.0 * max_single_rrf

        fused = []
        for w in all_words:
            ranks = word_best_ranks[w]
            rrf_sc = sum(1.0 / (self.rrf_k + r) for r in ranks.values())
            raw_sim = word_best_raw[w]
            channel_coverage = len(ranks) / 4.0  # 0.25 to 1.0

            # Primary acoustic sorting key: Acoustic Cosine Similarity is primary, RRF provides secondary tie-breaking
            acoustic_composite = (0.92 * raw_sim) + (0.08 * (rrf_sc / max_possible_rrf))
            fused.append((w, rrf_sc, raw_sim, word_best_candidate[w], acoustic_composite, channel_coverage))

        fused.sort(key=lambda x: (round(x[2], 4), x[4]), reverse=True)
        return [(w, rrf, raw, cand) for w, rrf, raw, cand, _, _ in fused]

    def process_and_recognize(
        self,
        audio_bytes_or_waveform,
        language_code: str,
        db: Optional[Session] = None
    ) -> RecognitionResult:
        """
        Executes robust voice recognition workflow:
        1. Audio preprocessing & 80Hz Butterworth highpass filtering
        2. Full speech utterance capture without syllable truncation
        3. Spectral noise reduction for pristine denoised voice derivative
        4. 4-way cross-path XLS-R 300M acoustic embedding search across
           BOTH original and denoised collections in the project
        5. Multi-channel RRF rank fusion and confidence calibration
        """
        lang_code = language_code.lower().strip()
        if lang_code not in ["badaga", "marwari"]:
            return RecognitionResult(
                decision="RETRY_REQUIRED",
                guidance=f"Unsupported language code '{language_code}'. Must be 'badaga' or 'marwari'."
            )

        # 1. Validation & Preprocessing (resample to 16kHz, 80Hz highpass, peak normalize)
        try:
            waveform, sr, meta = self.preprocessor.load_and_validate_audio(audio_bytes_or_waveform)
        except AudioValidationError as e:
            return RecognitionResult(
                decision="RETRY_REQUIRED",
                guidance=f"Audio quality issue: {str(e)}. Please speak clearly into the microphone."
            )

        # 2. Speech Utterance Extraction (capturing full utterance without syllable truncation)
        full_voice, start_ms, end_ms = self.preprocessor.extract_full_utterance(waveform, sr)
        if len(full_voice) < int(sr * 0.2):
            full_voice = waveform

        # 3. Hybrid Phonetic Transcription via Faster-Whisper with Domain Vocabulary
        stt_result = whisper_service.transcribe(full_voice, language_code=lang_code)
        transcription = (stt_result.get("text") or "").strip()
        if not transcription:
            # Fallback to whole waveform if sliced utterance was too brief
            stt_result = whisper_service.transcribe(waveform, language_code=lang_code)
            transcription = (stt_result.get("text") or "").strip()

        lexical_match = lexical_matcher.find_match(transcription, language_code=lang_code) if transcription else None
        lex_word = lexical_match[0] if lexical_match else None
        lex_conf = lexical_match[1] if lexical_match else 0.0

        # 4. Dual-Path Voice Encoding (Clean Original + Spectral Denoised Derivative)
        denoised_voice = self.preprocessor.create_denoised_derivative(full_voice, sr)
        orig_vector, _ = self.encoder.encode_waveform(full_voice, sr)
        denoised_vector, _ = self.encoder.encode_waveform(denoised_voice, sr)

        orig_col = f"{lang_code}_original_v1"
        denoised_col = f"{lang_code}_denoised_v1"

        top_k_search = max(settings.RECOGNITION_TOP_K, 35)

        # 5. 4-Way Cross-Path Search against BOTH Original and Denoised project collections:
        cands_orig_orig, store1 = self.vector_router.search(orig_col, orig_vector.tolist(), top_k=top_k_search)
        cands_orig_den, store2 = self.vector_router.search(denoised_col, orig_vector.tolist(), top_k=top_k_search)
        cands_den_orig, store3 = self.vector_router.search(orig_col, denoised_vector.tolist(), top_k=top_k_search)
        cands_den_den, store4 = self.vector_router.search(denoised_col, denoised_vector.tolist(), top_k=top_k_search)

        store_used = store1 if store1 != "none" else store2

        # 6. Fuse all 4 candidate lists with deduplication
        fused_ranked = self.compute_rrf(
            cands_orig_orig,
            cands_orig_den,
            cands_den_orig,
            cands_den_den
        )

        # 7. Hybrid Decision: Combine Lexical/Phonetic Grounding with 4-Way Acoustic Search
        top_w_id = None
        top_confidence = 0.0
        top_vocab = None

        if lex_word and lex_conf >= 0.75:
            # Phonetic grounding matched a verified canonical word
            top_w_id = lex_word["external_word_id"]
            top_vocab = lex_word
            top_confidence = max(0.95, lex_conf)
            logger.info("Phonetic/Lexical Match prioritized", word_id=top_w_id, transcription=transcription, confidence=top_confidence)
        elif fused_ranked:
            top_w_id, top_rrf, top_raw_sim, top_candidate = fused_ranked[0]
            top_vocab = vocab_store.get_vocabulary_by_id(top_w_id, language=lang_code)
            top_confidence = top_raw_sim

        if top_vocab and top_w_id:
            # Build alternative acoustic candidates from ranked vector search
            alt_list = []
            for w_id, rrf_sc, raw_sc, cand in fused_ranked:
                if w_id != top_w_id and len(alt_list) < 5:
                    ve = vocab_store.get_vocabulary_by_id(w_id, language=lang_code)
                    if ve:
                        alt_list.append(
                            AlternativeCandidate(
                                word_id=w_id,
                                source_word=ve.get("source_word"),
                                tamil_meaning=ve["tamil_meaning"],
                                english_meaning=ve["english_meaning"],
                                fusion_score=round(rrf_sc, 4),
                                raw_similarity=round(raw_sc, 4)
                            )
                        )

            audio_url = None
            if top_vocab.get("audio_assets"):
                audio_url = top_vocab["audio_assets"][0].get("audio_url")

            # Decision calibration
            if top_confidence >= 0.70:
                decision = "ACCEPTED"
                guidance = f"Matched '{top_vocab['english_meaning']}' ({top_vocab.get('source_word', '')}) accurately from voice acoustics and speech characteristics."
            elif top_confidence >= 0.50:
                decision = "AMBIGUOUS"
                guidance = f"Voice characteristics resemble '{top_vocab['english_meaning']}', but multiple words share similar acoustics."
            else:
                decision = "UNKNOWN"
                guidance = "Spoken audio did not match any verified dataset recording."

            return RecognitionResult(
                decision=decision,
                top_word_id=top_w_id,
                source_word=top_vocab.get("source_word"),
                tamil_meaning=top_vocab["tamil_meaning"],
                english_meaning=top_vocab["english_meaning"],
                confidence_score=round(top_confidence, 4),
                fusion_score=round(fused_ranked[0][1] if fused_ranked else 0.05, 4),
                alternatives=alt_list,
                store_used=store_used,
                guidance=guidance,
                audio_asset_url=audio_url,
                transcription=transcription or top_vocab["english_meaning"]
            )

        # Inconclusive / retry
        return RecognitionResult(
            decision="RETRY_REQUIRED",
            confidence_score=0.0,
            fusion_score=0.0,
            alternatives=[],
            store_used=store_used,
            guidance="Could not clearly identify the spoken word. Please speak clearly into the microphone.",
            transcription=transcription or None
        )

