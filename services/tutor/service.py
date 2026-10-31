"""
AI Teaching Assistant Service.
Enforces strict VectorDB/Canonical grounding, hallucination prevention,
multilingual query understanding (Tamil & English), and native voice retrieval.
"""

import re
import urllib.parse
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from pydantic import BaseModel

from apps.api.app.models.entities import VocabularyEntry, Language, Lesson
from services.tutor.providers import LLMRouter, TutorResponseSchema
from services.recognition.lexical_matcher import lexical_matcher
from apps.api.app.core.logging import logger


class GroundedTutorResponse(BaseModel):
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


SYSTEM_PROMPT = """
You are the official AI Teaching Assistant for Badaga and Marwari heritage language education.
Your fundamental mission is to educate students and teachers about vocabulary definitions, cultural context, and authentic native pronunciations.

Core Operating Instructions:
1. When the user asks in English or Tamil (e.g. "What is mother in Badaga?", "அம்மா என்றால் படக மொழியில் என்ன?"), or asks about a spoken dialect pronunciation / term (such as 'thala', 'thale', 'thele', 'mandai' for head, or 'nadoo' for tongue), match against english_meaning, tamil_meaning, source_spelling, or spoken_variants in the approved vocabulary.
2. Structure your educational answer clearly:
   - Provide the native word pronunciation / script (source spelling or spoken variant).
   - Clearly state both the English meaning and the Tamil meaning (e.g. 'தலை' / 'head').
   - Inform the learner that native speaker audio recordings are available in the verified context for listening.
   - Mention usage notes or cultural examples if provided in the verified records.
3. If the user asks in Tamil, reply in clear Tamil (with English gloss) so the student learns seamlessly.
4. If the user asks in English, reply in English while highlighting both Badaga and Tamil meanings.
5. In your structured JSON response, ALWAYS include the matched canonical Word IDs (e.g. ["W0001"]) in `vocabulary_references` so the system can retrieve the verified native voice audio recordings.
6. NEVER invent, guess, or hallucinate words, meanings, or pronunciations not found in the verified context.
7. If no relevant word exists in the verified database context, politely state:
   "This information is currently unavailable in the verified dictionary."
"""


class TutorService:
    def __init__(self):
        self.router = LLMRouter()

    def _find_matching_context_words(
        self,
        user_message: str,
        lang_code: str,
        active_word_id: Optional[str] = None,
        limit: int = 8
    ) -> List[Dict[str, Any]]:
        from services.vector_store.vocab_store import vocab_store
        from services.recognition.lexical_matcher import lexical_matcher
        
        q_raw = user_message.strip()
        q_lower = q_raw.lower()
        items = vocab_store.get_vocabulary(language=lang_code)
        
        context_words = []
        
        # 1. Active Word ID Priority
        if active_word_id:
            w_item = vocab_store.get_vocabulary_by_id(active_word_id, language=lang_code)
            if w_item and w_item.get("language_code") == lang_code:
                context_words.append(w_item)

        # 2. Check full query and non-stopword tokens against Lexical Matcher (covers thala, thale, thele, nadoo...)
        stopwords = {
            "what", "is", "the", "word", "for", "in", "badaga", "marwari",
            "how", "to", "say", "tell", "me", "does", "mean", "meaning",
            "pronounce", "explain", "please", "can", "you", "a", "an", "do", "of",
            "are", "tamil", "english"
        }
        tokens = [t.strip("?,.!;:\"'()[]{}") for t in re.findall(r'[\w\u0B80-\u0BFF]+', q_lower)]
        tokens_set = set(t for t in tokens if len(t) >= 2)

        # Check full query first
        q_clean = lexical_matcher.clean_text(q_raw)
        full_match = lexical_matcher.find_match(q_clean, language_code=lang_code)
        if full_match:
            cand_item = full_match[0]
            if not any(cw["external_word_id"] == cand_item["external_word_id"] for cw in context_words):
                context_words.append(cand_item)

        # Check non-stopword tokens
        for tok in tokens:
            if tok not in stopwords and len(tok) >= 2:
                tok_lookup = "eye" if tok == "i" else tok
                tok_match = lexical_matcher.find_match(tok_lookup, language_code=lang_code)
                if tok_match:
                    cand_item = tok_match[0]
                    if not any(cw["external_word_id"] == cand_item["external_word_id"] for cw in context_words):
                        context_words.append(cand_item)

        scored = []
        for it in items:
            score = 0
            wid = it["external_word_id"].lower()
            eng = it["english_meaning"].lower()
            tam = it["tamil_meaning"].strip()
            src = (it.get("source_word") or "").lower()

            # Exact Word ID match (e.g. 'W0051')
            if wid in tokens_set or wid == q_lower:
                score += 150

            # Substring match for Tamil meaning in user message (e.g. 'அம்மா' in 'அம்மா படகில் என்ன?')
            if tam and tam in q_raw:
                score += 120

            # Substring match for English meaning in user message (e.g. 'mother' in 'what is mother in badaga?')
            if eng and (eng in q_lower or (len(eng) > 3 and eng in q_raw)):
                score += 100

            # Native source word match
            if src and src in q_lower:
                score += 90

            # Token-level overlap
            for tok in tokens_set:
                if tok == eng:
                    score += 60
                elif tok in eng:
                    score += 25
                if tok == tam:
                    score += 60
                elif tok in tam:
                    score += 25
                if src and tok == src:
                    score += 50

            if score > 0:
                scored.append((score, it))

        scored.sort(key=lambda x: x[0], reverse=True)

        for _, it in scored:
            if not any(cw["external_word_id"] == it["external_word_id"] for cw in context_words):
                context_words.append(it)
                if len(context_words) >= limit:
                    break

        # Fallback seed context if no specific words found
        if not context_words:
            context_words = vocab_store.get_vocabulary(language=lang_code, limit=5)

        return context_words

    def chat_with_tutor(
        self,
        user_message: str,
        language_code: str,
        db: Optional[Session] = None,
        active_word_id: Optional[str] = None,
        lesson_id: Optional[str] = None
    ) -> GroundedTutorResponse:
        lang_code = language_code.lower().strip()
        canonical_name = "Badaga" if lang_code == "badaga" else "Marwari"
        
        from services.vector_store.vocab_store import vocab_store
        context_words = self._find_matching_context_words(
            user_message=user_message,
            lang_code=lang_code,
            active_word_id=active_word_id,
            limit=8
        )

        # Build constrained context dictionary
        raw_tokens = [t.strip("?,.!;:\"'()[]{}") for t in re.findall(r'[\w\u0B80-\u0BFF]+', user_message.lower())]
        stopwords = {
            "what", "is", "the", "word", "for", "in", "badaga", "marwari",
            "how", "to", "say", "tell", "me", "does", "mean", "meaning",
            "pronounce", "explain", "please", "can", "you", "a", "an", "do", "of"
        }
        query_words = [t for t in raw_tokens if t not in stopwords and len(t) >= 2]

        approved_entries = []
        for v in context_words:
            wid = v.get("external_word_id")
            spoken_variants = list(lexical_matcher.get_aliases_for_word(wid, limit=15))
            for qw in query_words:
                qm = lexical_matcher.find_match(qw, language_code=lang_code)
                if qm and qm[0].get("external_word_id") == wid:
                    if qw not in spoken_variants:
                        spoken_variants.insert(0, qw)

            approved_entries.append({
                "word_id": wid,
                "source_spelling": v.get("source_word") or "Unrecorded",
                "tamil_meaning": v.get("tamil_meaning"),
                "english_meaning": v.get("english_meaning"),
                "spoken_variants": spoken_variants[:12],
                "notes": v.get("notes") or "",
                "audio_available": len(v.get("audio_assets", [])) > 0
            })

        context_data = {
            "language": canonical_name,
            "approved_vocabulary": approved_entries
        }

        # 2. Call LLM Router (Gemini primary, Groq fallback)
        raw_response, provider_used = self.router.generate_response(
            system_prompt=SYSTEM_PROMPT,
            user_message=user_message,
            context_data=context_data
        )

        # 3. Post-generation Grounding & Verification Layer with Audio Linking
        verified_vocab_list = []
        is_unavailable = "currently unavailable" in raw_response.response_text.lower() or "not available" in raw_response.response_text.lower()
        
        refs = []
        if not is_unavailable:
            if raw_response.vocabulary_references:
                refs = raw_response.vocabulary_references
            elif active_word_id:
                refs = [active_word_id]
            elif context_words and len(context_words) <= 3:
                refs = [w.get("external_word_id") for w in context_words]
        
        seen_refs = set()
        for ref_id in refs:
            entry = vocab_store.get_vocabulary_by_id(ref_id, language=lang_code)
            if entry and entry.get("external_word_id") not in seen_refs:
                seen_refs.add(entry.get("external_word_id"))
                
                eng_meaning = entry.get("english_meaning", "")
                tam_meaning = entry.get("tamil_meaning", "")
                assets = entry.get("audio_assets", [])
                primary_audio = assets[0]["audio_url"] if assets else None
                
                verified_vocab_list.append({
                    "word_id": entry.get("external_word_id"),
                    "language_code": entry.get("language_code"),
                    "language_name": entry.get("language_name"),
                    "source_word": entry.get("source_word"),
                    "tamil_meaning": tam_meaning,
                    "english_meaning": eng_meaning,
                    "notes": entry.get("notes"),
                    "audio_url": primary_audio,
                    "audio_assets": assets,
                    "english_tts_url": f"/api/v1/vocabulary/tts/synthesize?text={urllib.parse.quote(eng_meaning)}&lang=en",
                    "tamil_tts_url": f"/api/v1/vocabulary/tts/synthesize?text={urllib.parse.quote(tam_meaning)}&lang=ta",
                })

        # Primary audio shortcuts from top verified entry
        top_audio_url = None
        top_assets = []
        top_eng_tts = None
        top_tam_tts = None

        if verified_vocab_list:
            top_audio_url = verified_vocab_list[0].get("audio_url")
            top_assets = verified_vocab_list[0].get("audio_assets", [])
            top_eng_tts = verified_vocab_list[0].get("english_tts_url")
            top_tam_tts = verified_vocab_list[0].get("tamil_tts_url")

        return GroundedTutorResponse(
            message=raw_response.response_text,
            intent=raw_response.intent,
            provider_used=provider_used,
            verified_vocabulary=verified_vocab_list,
            examples=raw_response.examples,
            uncertainty_note=raw_response.uncertainty_notes,
            requires_teacher_review=raw_response.requires_teacher_review,
            audio_url=top_audio_url,
            audio_assets=top_assets,
            english_tts_url=top_eng_tts,
            tamil_tts_url=top_tam_tts
        )
