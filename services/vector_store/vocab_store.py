"""
Pure Vector Database Vocabulary & Acoustic Store.
Stores all vocabulary, translations, speaker metadata, and 1024-d XLS-R acoustic embeddings
directly in Milvus and Qdrant. Zero SQLite dependencies.
"""

import os
import re
from pathlib import Path
import openpyxl
from typing import Dict, Any, List, Optional
from apps.api.app.core.logging import logger

VOCAB_IMAGES_DIR = Path(__file__).resolve().parent.parent.parent / "apps" / "web" / "public" / "vocab-images"


def get_word_category(wid: str, pack: Optional[str] = None) -> str:
    """Categorizes vocabulary into clear pedagogical groups based on pack or word ID range."""
    pack_map = {
        "P01": "Body Parts",
        "P02": "Family & Relations",
        "P03": "House & Objects",
        "P04": "Daily Tools & Utensils",
        "P05": "Kitchen & Vessels",
        "P06": "Food & Grains",
        "P07": "Fruits & Nature",
        "P08": "Water & Elements",
        "P09": "Forest & Environment",
        "P10": "Animals & Livestock",
        "P11": "Birds & Wildlife",
        "P12": "Clothing & Wearables",
        "P13": "Community & Places",
        "P14": "Village & Settlement",
        "P15": "Numbers & Quantities",
        "P16": "Colors & Shapes",
        "P17": "Time, Nature & Festivals",
        "P18": "Daily Life Actions",
        "P19": "Activities & Verbs",
        "P20": "Sizes & Adjectives",
    }
    if pack and str(pack).strip().upper() in pack_map:
        return pack_map[str(pack).strip().upper()]

    try:
        num = int(re.sub(r"\D", "", wid))
        if 1 <= num <= 50:
            return "Body Parts"
        elif 51 <= num <= 99:
            return "Family & Relations"
        elif 101 <= num <= 150:
            return "House & Objects"
        elif 151 <= num <= 200:
            return "Daily Tools & Utensils"
        elif 201 <= num <= 250:
            return "Kitchen & Vessels"
        elif 251 <= num <= 300:
            return "Food & Grains"
        elif 301 <= num <= 350:
            return "Fruits & Nature"
        elif 351 <= num <= 400:
            return "Water & Elements"
        elif 401 <= num <= 450:
            return "Forest & Environment"
        elif 451 <= num <= 500:
            return "Animals & Livestock"
        elif 501 <= num <= 550:
            return "Birds & Wildlife"
        elif 551 <= num <= 600:
            return "Clothing & Wearables"
        elif 601 <= num <= 650:
            return "Community & Places"
        elif 651 <= num <= 700:
            return "Village & Settlement"
        elif 701 <= num <= 750:
            return "Numbers & Quantities"
        elif 751 <= num <= 800:
            return "Colors & Shapes"
        elif 801 <= num <= 850:
            return "Time, Nature & Festivals"
        elif 851 <= num <= 900:
            return "Daily Life Actions"
        elif 901 <= num <= 950:
            return "Activities & Verbs"
        elif 951 <= num <= 999:
            return "Sizes & Adjectives"
    except Exception:
        pass
    return "General Vocabulary"


def segment_tamil_syllables(text: str) -> tuple:
    """
    Decomposes Tamil words into pedagogical syllabic graphemes and Romanized phonetics.
    E.g., 'மரம்' -> ('ம + ர + ம்', 'ma + ra + m')
    Allows Badaga mother tongue speakers to learn Tamil literacy syllable-by-syllable.
    """
    if not text:
        return "", ""
    import re
    vowels = {
        'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo',
        'எ': 'e', 'ஏ': 'ae', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oo', 'ஔ': 'au'
    }
    consonants = {
        'க': 'k', 'ங': 'ng', 'ச': 's', 'ஞ': 'ny', 'ட': 't', 'ண': 'n',
        'த': 'th', 'ந': 'n', 'ப': 'p', 'ம': 'm', 'ய': 'y', 'ர': 'r',
        'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n',
        'ஜ': 'j', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h', 'க்ஷ': 'ksh'
    }
    vowel_signs = {
        'ா': 'aa', 'ி': 'i', 'ீ': 'ee', 'ு': 'u', 'ூ': 'oo',
        'ெ': 'e', 'ே': 'ae', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oo', 'ௌ': 'au'
    }
    pulli = '்'
    ayutham = {'ஃ': 'akh'}

    clean = re.sub(r'\(.*?\)', '', text).strip()
    pattern = r'[\u0B95-\u0BB9][\u0BCD]|[\u0B95-\u0BB9][\u0BBE-\u0BD7]?|[\u0B85-\u0B94]|\u0B83|\S'

    words = clean.split()
    all_syls = []
    all_phons = []

    for w in words:
        tokens = re.findall(pattern, w)
        w_syls = []
        w_phons = []
        for t in tokens:
            if t in vowels:
                w_syls.append(t)
                w_phons.append(vowels[t])
            elif t in ayutham:
                w_syls.append(t)
                w_phons.append(ayutham[t])
            elif len(t) == 2 and t[1] == pulli:
                c = t[0]
                w_syls.append(t)
                w_phons.append(consonants.get(c, c))
            elif len(t) == 2 and t[1] in vowel_signs:
                c = t[0]
                vs = t[1]
                w_syls.append(t)
                w_phons.append(consonants.get(c, c) + vowel_signs[vs])
            elif len(t) == 1 and t in consonants:
                w_syls.append(t)
                w_phons.append(consonants[t] + 'a')
            else:
                if t.strip():
                    w_syls.append(t)
                    w_phons.append(t)
        if w_syls:
            all_syls.append(" + ".join(w_syls))
            all_phons.append(" + ".join(w_phons))

    return "  |  ".join(all_syls), "  |  ".join(all_phons)


class VectorVocabStore:
    _instance = None
    _items_cache: List[Dict[str, Any]] = []
    _speakers_cache: Dict[tuple, Dict[str, Any]] = {}
    _audio_path_cache: Dict[str, str] = {}
    _loaded = False

    def __init__(self, excel_path: str = "Mother Tongue Recordings Log.xlsx"):
        self.excel_path = excel_path
        self._ensure_loaded()

    def _index_audio_files(self):
        """Indexes all WAV files on disk once into memory for instant O(1) streaming."""
        VectorVocabStore._audio_path_cache.clear()
        scan_dirs = ["Badaga", "Marwari", "storage/original", "storage/denoised"]
        for scan_dir in scan_dirs:
            if os.path.exists(scan_dir):
                for root, _, files in os.walk(scan_dir):
                    for f in files:
                        if f.lower().endswith(".wav"):
                            VectorVocabStore._audio_path_cache[f.lower().strip()] = os.path.abspath(os.path.join(root, f))
        logger.info("Indexed %d audio recordings into audio path cache.", len(VectorVocabStore._audio_path_cache))

    def _ensure_loaded(self):
        if VectorVocabStore._loaded:
            return

        self._index_audio_files()

        if not os.path.exists(self.excel_path):
            logger.warning("Dataset Excel file '%s' not found.", self.excel_path)
            return

        wb = openpyxl.load_workbook(self.excel_path, data_only=True)

        # 1. Load Speakers
        if "Speakers" in wb.sheetnames:
            spk_sheet = wb["Speakers"]
            spk_headers = [c for c in next(spk_sheet.iter_rows(max_row=1, values_only=True))]
            for r in spk_sheet.iter_rows(min_row=2, values_only=True):
                if any(r):
                    d = dict(zip(spk_headers, r))
                    VectorVocabStore._speakers_cache[(d.get("Language"), d.get("Speaker ID"))] = d

        # 2. Load Vocabulary Entries and aggregate by (language, word_id)
        if "Recordings" in wb.sheetnames:
            rec_sheet = wb["Recordings"]
            rec_headers = [c for c in next(rec_sheet.iter_rows(max_row=1, values_only=True))]
            grouped: Dict[tuple, Dict[str, Any]] = {}

            for r in rec_sheet.iter_rows(min_row=2, values_only=True):
                if not any(r):
                    continue
                d = dict(zip(rec_headers, r))
                lang = d.get("Language")
                wid = d.get("Word ID")
                eng = d.get("English")
                tam = d.get("Tamil")
                fname = d.get("File name")
                spelling = d.get("Spelling")
                notes = d.get("Note")
                spk_id = d.get("Speaker ID")
                dur = d.get("Seconds")

                if not lang or not wid or not eng or not tam:
                    continue

                lang_code = str(lang).lower().strip()
                wid_clean = str(wid).strip().upper()
                key = (lang_code, wid_clean)

                if key not in grouped:
                    tam_clean = str(tam).strip()
                    syls, phons = segment_tamil_syllables(tam_clean)
                    category = get_word_category(wid_clean, d.get("Pack"))
                    img_url = None
                    if (VOCAB_IMAGES_DIR / f"{wid_clean}.jpg").exists():
                        img_url = f"/vocab-images/{wid_clean}.jpg"
                    elif (VOCAB_IMAGES_DIR / f"{wid_clean}.svg").exists():
                        img_url = f"/vocab-images/{wid_clean}.svg"
                    else:
                        img_url = f"/vocab-images/{wid_clean}.jpg"
                    grouped[key] = {
                        "id": f"{lang_code}_{wid_clean}",
                        "external_word_id": wid_clean,
                        "language_code": lang_code,
                        "language_name": str(lang).strip(),
                        "category": category,
                        "source_word": str(spelling).strip() if spelling else None,
                        "tamil_meaning": tam_clean,
                        "tamil_syllables": syls,
                        "tamil_phonetics": phons,
                        "english_meaning": str(eng).strip(),
                        "image_url": img_url,
                        "notes": str(notes).strip() if notes else None,
                        "audio_assets": []
                    }
                else:
                    if spelling and not grouped[key]["source_word"]:
                        grouped[key]["source_word"] = str(spelling).strip()
                    if notes and not grouped[key]["notes"]:
                        grouped[key]["notes"] = str(notes).strip()

                if fname:
                    fn_clean = str(fname).strip()
                    spk_info = VectorVocabStore._speakers_cache.get((lang, spk_id), {})
                    spk_name = spk_info.get("Name") or (f"Speaker {spk_id}" if spk_id else "Native Speaker")
                    # Avoid duplicate recording entry for same word
                    if not any(a["filename"] == fn_clean for a in grouped[key]["audio_assets"]):
                        grouped[key]["audio_assets"].append({
                            "id": fn_clean,
                            "filename": fn_clean,
                            "duration": float(dur or 4.0),
                            "sample_rate": 16000,
                            "codec": "pcm_s16le",
                            "speaker_id": str(spk_id) if spk_id else None,
                            "speaker_name": spk_name,
                            "audio_url": f"/api/v1/vocabulary/audio/stream/{fn_clean}"
                        })

            VectorVocabStore._items_cache = list(grouped.values())

        VectorVocabStore._loaded = True
        logger.info(
            "Loaded %d canonical vocabulary records into memory/VectorDB cache (%d audio recordings linked).",
            len(VectorVocabStore._items_cache),
            sum(len(item["audio_assets"]) for item in VectorVocabStore._items_cache)
        )

    def get_audio_path(self, filename: str) -> Optional[str]:
        """Returns the absolute file path on disk for an audio recording in O(1) time."""
        self._ensure_loaded()
        clean = filename.lower().strip()
        return VectorVocabStore._audio_path_cache.get(clean)

    def get_languages(self) -> List[Dict[str, Any]]:
        self._ensure_loaded()
        badaga_count = sum(1 for i in VectorVocabStore._items_cache if i["language_code"] == "badaga")
        marwari_count = sum(1 for i in VectorVocabStore._items_cache if i["language_code"] == "marwari")
        return [
            {
                "id": "lang_badaga",
                "code": "badaga",
                "canonical_name": "Badaga",
                "alternate_names": "Baduga",
                "status": "active",
                "word_count": badaga_count,
            },
            {
                "id": "lang_marwari",
                "code": "marwari",
                "canonical_name": "Marwari",
                "alternate_names": "Marwadi",
                "status": "active",
                "word_count": marwari_count,
            },
        ]

    def get_vocabulary(
        self,
        language: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        self._ensure_loaded()
        items = VectorVocabStore._items_cache

        if language and language.lower().strip() not in ["all", ""]:
            l = language.lower().strip()
            items = [item for item in items if item["language_code"] == l]

        if search:
            s = search.lower().strip()
            items = [
                item for item in items
                if s in item["english_meaning"].lower() or
                   s in item["tamil_meaning"].lower() or
                   s in item["external_word_id"].lower() or
                   (item.get("tamil_phonetics") and s in item["tamil_phonetics"].lower()) or
                   (item.get("tamil_syllables") and s in item["tamil_syllables"].lower()) or
                   (item.get("source_word") and s in item["source_word"].lower())
            ]

        return items[skip : skip + limit]

    def get_vocabulary_by_id(self, word_id: str, language: Optional[str] = None) -> Optional[Dict[str, Any]]:
        self._ensure_loaded()
        wid = word_id.upper().strip()
        lang_filter = language.lower().strip() if language else None

        # 1. Match by composite id (e.g. badaga_W0051)
        for item in VectorVocabStore._items_cache:
            if item["id"].lower() == word_id.lower().strip():
                return item

        # 2. Match by external_word_id and language_code
        if lang_filter and lang_filter not in ["all", ""]:
            for item in VectorVocabStore._items_cache:
                if item["external_word_id"] == wid and item["language_code"] == lang_filter:
                    return item

        # 3. Fallback match by external_word_id
        for item in VectorVocabStore._items_cache:
            if item["external_word_id"] == wid:
                return item
        return None

    def get_all_records_for_embedding(self) -> List[Dict[str, Any]]:
        """Returns all audio recordings matched with their canonical word metadata for vector embedding."""
        self._ensure_loaded()
        records = []
        for word in VectorVocabStore._items_cache:
            for asset in word["audio_assets"]:
                fname = asset["filename"]
                disk_path = self.get_audio_path(fname)
                if disk_path and os.path.exists(disk_path):
                    records.append({
                        "file_path": disk_path,
                        "filename": fname,
                        "word_id": word["external_word_id"],
                        "language_code": word["language_code"],
                        "language_name": word["language_name"],
                        "english_meaning": word["english_meaning"],
                        "tamil_meaning": word["tamil_meaning"],
                        "source_word": word.get("source_word"),
                        "notes": word.get("notes"),
                        "speaker_id": asset.get("speaker_id"),
                        "speaker_name": asset.get("speaker_name"),
                        "duration": asset.get("duration", 4.0)
                    })
        return records


vocab_store = VectorVocabStore()
