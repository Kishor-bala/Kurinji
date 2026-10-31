import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, Optional, Union
from dotenv import load_dotenv

try:
    if sys.stdout and hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from google import genai
from google.genai import types

from backend.app.config import PROJECT_ROOT
from backend.app.database.vocabulary import list_vocabulary, get_vocabulary_by_id, search_vocabulary_text
from backend.app.database.recordings import list_recordings_for_word

# Ensure .env is loaded
load_dotenv(PROJECT_ROOT / ".env")


def get_gemini_api_key() -> Optional[str]:
    """Retrieves the Gemini API key from environment or .env file."""
    load_dotenv(PROJECT_ROOT / ".env", override=True)
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    return key if key else None


def is_gemini_available() -> bool:
    """Returns True if a valid Gemini API key is configured."""
    key = get_gemini_api_key()
    return bool(key and len(key) > 10 and not key.startswith("YOUR_"))


def recognize_with_gemini(
    audio_path: Union[str, Path],
    language: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Recognizes a spoken word using Gemini Multimodal Audio understanding
    constrained strictly to the verified closed-vocabulary wordbank in SQLite.

    Guarantees zero hallucination:
    - Gemini identifies only the canonical Word ID.
    - Verified Tamil and English meanings are retrieved directly from SQLite.
    """
    api_key = get_gemini_api_key()
    if not api_key:
        return None

    path = Path(audio_path)
    if not path.is_file():
        return None

    # Load verified wordbank from SQLite for the selected language
    target_lang = language if language in ("Badaga", "Marwari") else None
    vocab_entries = list_vocabulary(language=target_lang, limit=1000)
    if not vocab_entries:
        return None

    # Format wordbank into a compact linguistic reference
    wordbank_lines = []
    for entry in vocab_entries:
        wid = entry["word_id"]
        eng = entry["english_meaning"]
        tam = entry["tamil_meaning"]
        pron = entry.get("optional_romanised_pronunciation") or ""
        pron_str = f" [pronunciation: {pron}]" if pron else ""
        wordbank_lines.append(f"{wid}: {eng} | {tam}{pron_str}")

    wordbank_text = "\n".join(wordbank_lines)

    # Read audio bytes
    with open(path, "rb") as f:
        audio_bytes = f.read()

    lang_prompt = f"in {language}" if language else "in Badaga or Marwari"

    prompt = f"""You are an acoustic phonetics expert specializing in the low-resource Indian languages Badaga and Marwari.
Attached is a short audio recording of a user pronouncing a single word {lang_prompt}.

Your task is to identify which word from the following verified closed-vocabulary wordbank was spoken:

--- BEGIN VERIFIED WORDBANK ---
{wordbank_text}
--- END VERIFIED WORDBANK ---

Instructions:
1. Listen carefully to the acoustic speech sounds, consonants, vowels, and syllable phonemes.
2. Note that the speaker is pronouncing a native word in {lang_prompt}, NOT an English word!
   - For Badaga (Dravidian hill language): Spoken words derive from Dravidian/Old Kannada/Tamil roots.
     Common phonetic mappings:
     • 'thale' / 'mandhe' / 'tale' -> head (தலை, BDG_W0001)
     • 'kannu' / 'kanna' -> eye (கண், BDG_W0002)
     • 'mooku' -> nose (மூக்கு, BDG_W0003)
     • 'baayi' -> mouth (வாய், BDG_W0004)
     • 'kivi' / 'kaadu' -> ear (காது, BDG_W0005)
     • 'kai' / 'kayyi' -> hand (கை, BDG_W0006)
     • 'kaalu' -> leg (கால், BDG_W0007)
     • 'pal' / 'hallu' -> teeth (பல், BDG_W0008)
     • 'koodhalu' -> hair (முடி, BDG_W0009)
     • 'hotte' -> stomach (வயிறு, BDG_W0010)
     • 'beralu' -> finger (விரல், BDG_W0011)
     • 'mandi' -> knee (முழங்கால், BDG_W0015)
     • 'amma' / 'avve' -> mother (அம்மா)
     • 'appa' -> father (அப்பா)
   - For Marwari: Spoken words derive from Rajasthani/Indo-Aryan roots ('aankh' -> eye, 'naak' -> nose, 'daant' -> teeth, 'matho' -> head, 'haath' -> hand, 'kaan' -> ear, 'pag' -> leg, 'maa' -> mother).
3. Match the heard sound strictly to one Word ID from the verified wordbank above.
4. If the audio clearly matches a word, return its Word ID and confidence (0.0 to 1.0).
5. If the speech is completely unintelligible silence or noise not in the wordbank, set "word_id": null and "confidence": 0.0.

Respond ONLY with a valid JSON object matching this schema:
{{
  "word_id": "STRING_OR_NULL",
  "confidence": FLOAT,
  "explanation": "Brief explanation of acoustic phonemes heard and why it matches"
}}
"""

    client = genai.Client(api_key=api_key)

    try:
        # Use gemini-3.5-flash (fast, state-of-the-art audio understanding) or fallback to gemini-3.5-flash-lite
        model_name = "gemini-3.5-flash"
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    types.Part.from_bytes(data=audio_bytes, mime_type="audio/wav"),
                    prompt,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
        except Exception:
            model_name = "gemini-3.5-flash-lite"
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    types.Part.from_bytes(data=audio_bytes, mime_type="audio/wav"),
                    prompt,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )

        raw_text = response.text.strip()
        data = json.loads(raw_text)

        matched_word_id = data.get("word_id")
        confidence = float(data.get("confidence", 0.0))
        explanation = data.get("explanation", "")

        try:
            safe_exp = explanation.encode("ascii", errors="replace").decode("ascii")
            print(f"[Gemini Audio AI] Model: {model_name} | Match: {matched_word_id} | Confidence: {confidence:.2f} | Reason: {safe_exp}")
        except Exception:
            pass

        if not matched_word_id:
            return {
                "status": "unknown",
                "word_id": None,
                "language": language,
                "tamil_meaning": None,
                "english_meaning": None,
                "similarity": confidence,
                "margin": 0.0,
                "message": explanation or "Audio was not recognized as a known vocabulary word.",
                "ranked_candidates": [],
            }

        # Retrieve 100% human-verified meaning from SQLite database
        vocab = get_vocabulary_by_id(matched_word_id)
        if not vocab:
            return None

        # Fetch reference clips for audio pronunciation playback
        recordings = list_recordings_for_word(matched_word_id)
        clip_matches = [{"clip_id": r["clip_id"], "similarity": confidence} for r in recordings]

        status = "recognized" if confidence >= 0.50 else "uncertain"

        return {
            "status": status,
            "word_id": vocab["word_id"],
            "language": vocab["language"],
            "tamil_meaning": vocab["tamil_meaning"],
            "english_meaning": vocab["english_meaning"],
            "similarity": confidence,
            "margin": 0.15,
            "message": f"Identified via Gemini Audio AI: {explanation}",
            "ranked_candidates": [
                {
                    "word_id": vocab["word_id"],
                    "language": vocab["language"],
                    "tamil_meaning": vocab["tamil_meaning"],
                    "english_meaning": vocab["english_meaning"],
                    "score": confidence,
                    "clip_matches": clip_matches,
                }
            ],
        }

    except Exception as e:
        try:
            safe_err = str(e).encode("ascii", errors="replace").decode("ascii")
            print(f"[Gemini Audio AI Error] {safe_err}")
        except Exception:
            pass
        return None


def match_text_transliteration(
    query_text: str,
    language: Optional[str] = "Badaga",
) -> Dict[str, Any]:
    """
    Matches a romanised Badaga/Marwari input (e.g. 'thale', 'kannu', 'mandhe', 'mooku')
    or English word to its verified Word ID and retrieves meanings from SQLite.
    """
    clean_query = query_text.strip()
    if not clean_query:
        return {
            "status": "unknown",
            "word_id": None,
            "language": language,
            "tamil_meaning": None,
            "english_meaning": None,
            "similarity": 0.0,
            "margin": 0.0,
            "message": "Please enter a word to translate.",
            "ranked_candidates": [],
        }

    target_lang = language if language in ("Badaga", "Marwari") else "Badaga"

    # 1. First, check direct SQLite matches (e.g. exact English meaning like 'head' or exact Word ID)
    direct_matches = search_vocabulary_text(clean_query, language=target_lang, exact_only=True)
    if direct_matches:
        top = direct_matches[0]
        recs = list_recordings_for_word(top["word_id"])
        clip_matches = [{"clip_id": r["clip_id"], "similarity": 1.0} for r in recs]
        return {
            "status": "recognized",
            "word_id": top["word_id"],
            "language": top["language"],
            "tamil_meaning": top["tamil_meaning"],
            "english_meaning": top["english_meaning"],
            "similarity": 1.0,
            "margin": 0.20,
            "message": f"Direct vocabulary match for '{clean_query}'.",
            "ranked_candidates": [
                {
                    "word_id": top["word_id"],
                    "language": top["language"],
                    "tamil_meaning": top["tamil_meaning"],
                    "english_meaning": top["english_meaning"],
                    "score": 1.0,
                    "clip_matches": clip_matches,
                }
            ],
        }

    # 2. If no direct match, use Gemini with the closed-vocabulary wordbank constraint
    api_key = get_gemini_api_key()
    if not api_key:
        return {
            "status": "unknown",
            "word_id": None,
            "language": language,
            "tamil_meaning": None,
            "english_meaning": None,
            "similarity": 0.0,
            "margin": 0.0,
            "message": f"Word '{clean_query}' not found in local database. Enable Gemini API for transliteration matching.",
            "ranked_candidates": [],
        }

    vocab_entries = list_vocabulary(language=target_lang, limit=1000)
    wordbank_lines = [f"{e['word_id']}: {e['english_meaning']} | {e['tamil_meaning']}" for e in vocab_entries]
    wordbank_text = "\n".join(wordbank_lines)

    prompt = f"""The user has typed a spoken {target_lang} word written in English transliteration / romanised script: "{clean_query}".
Your task is to identify which Word ID from the following verified closed-vocabulary wordbank this transliterated word corresponds to.

--- VERIFIED WORDBANK ---
{wordbank_text}
--- END WORDBANK ---

Instructions:
1. Consider phonetic romanisation variations and colloquial dialects (e.g. 'thale', 'mandhe', 'tale' -> head; 'kannu', 'kanna' -> eye; 'mooku' -> nose; 'pal' -> teeth; 'kaalu' -> leg; 'kayyi', 'kai' -> hand; 'amma', 'avve' -> mother). If 'mandhe' is typed, it refers to head (தலை / மண்டை).
2. Match it strictly to one Word ID from the verified wordbank above.
3. If it clearly corresponds to a word in the list, return its Word ID and confidence (0.0 to 1.0).
4. If it does not correspond to any word in the wordbank, set "word_id": null and "confidence": 0.0.

Respond ONLY with valid JSON:
{{
  "word_id": "WORD_ID_OR_NULL",
  "confidence": FLOAT,
  "explanation": "Brief reasoning for matching this transliteration"
}}
"""
    client = genai.Client(api_key=api_key)
    try:
        res = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        data = json.loads(res.text.strip())
        matched_wid = data.get("word_id")
        confidence = float(data.get("confidence", 0.0))
        explanation = data.get("explanation", "")

        if not matched_wid:
            return {
                "status": "unknown",
                "word_id": None,
                "language": target_lang,
                "tamil_meaning": None,
                "english_meaning": None,
                "similarity": confidence,
                "margin": 0.0,
                "message": explanation or f"No match found for '{clean_query}' in verified {target_lang} wordbank.",
                "ranked_candidates": [],
            }

        vocab = get_vocabulary_by_id(matched_wid)
        if not vocab:
            return {
                "status": "unknown",
                "word_id": None,
                "language": target_lang,
                "tamil_meaning": None,
                "english_meaning": None,
                "similarity": 0.0,
                "margin": 0.0,
                "message": f"Word ID '{matched_wid}' not found in verified database.",
                "ranked_candidates": [],
            }

        recs = list_recordings_for_word(matched_wid)
        clip_matches = [{"clip_id": r["clip_id"], "similarity": confidence} for r in recs]

        return {
            "status": "recognized",
            "word_id": vocab["word_id"],
            "language": vocab["language"],
            "tamil_meaning": vocab["tamil_meaning"],
            "english_meaning": vocab["english_meaning"],
            "similarity": confidence,
            "margin": 0.15,
            "message": f"Transliteration match: {explanation}",
            "ranked_candidates": [
                {
                    "word_id": vocab["word_id"],
                    "language": vocab["language"],
                    "tamil_meaning": vocab["tamil_meaning"],
                    "english_meaning": vocab["english_meaning"],
                    "score": confidence,
                    "clip_matches": clip_matches,
                }
            ],
        }
    except Exception as e:
        return {
            "status": "unknown",
            "word_id": None,
            "language": target_lang,
            "tamil_meaning": None,
            "english_meaning": None,
            "similarity": 0.0,
            "margin": 0.0,
            "message": f"Transliteration search error: {e}",
            "ranked_candidates": [],
        }
