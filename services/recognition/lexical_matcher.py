"""
Phonetic and Lexical Grounder for Speech Recognition.
Matches transcribed speech against canonical vocabulary records using
phonetic aliases, multilingual synonyms (English/Tamil/Native), and fuzzy string distance.
"""

import re
import difflib
from typing import Dict, Any, List, Optional, Tuple
from services.vector_store.vocab_store import vocab_store


# Comprehensive phonetic dictionary for spoken Badaga dialect terms
BADAGA_PHONETIC_MAP = {
    # Anatomy & Body parts
    "mandai": "W0001", "mande": "W0001", "mandi": "W0001", "mando": "W0001", "mandu": "W0001", "மண்டு": "W0001", "dalai": "W0001", "thalai": "W0001", "talai": "W0001", "tala": "W0001", "thala": "W0001", "thale": "W0001", "thele": "W0001", "தாலை": "W0001", "தலை": "W0001", "head": "W0001",
    "kannu": "W0002", "kanno": "W0002", "kann": "W0002", "kan": "W0002", "kani": "W0002", "kaani": "W0002", "gannu": "W0002", "ganno": "W0002", "gan": "W0002", "காணி": "W0002", "கண்": "W0002", "கண்ணு": "W0002", "eye": "W0002",
    "mooku": "W0003", "mookku": "W0003", "muku": "W0003", "mokou": "W0003", "moko": "W0003", "மூக்கு": "W0003", "nose": "W0003",
    "bayi": "W0004", "baayi": "W0004", "baaye": "W0004", "bae": "W0004", "bed": "W0004", "vaai": "W0004", "வாய்": "W0004", "mouth": "W0004",
    "kivi": "W0005", "kiwi": "W0005", "kibi": "W0005", "kaadhu": "W0005", "காது": "W0005", "ear": "W0005",
    "kai": "W0006", "kayyi": "W0006", "key": "W0006", "கை": "W0006", "hand": "W0006",
    "kaal": "W0007", "kaalu": "W0007", "kaalo": "W0007", "கால்": "W0007", "leg": "W0007",
    "hallu": "W0008", "pallu": "W0008", "pal": "W0008", "அல்லு": "W0008", "பல்": "W0008", "teeth": "W0008", "tooth": "W0008",
    "koodalu": "W0009", "kudalu": "W0009", "mudi": "W0009", "முடி": "W0009", "hair": "W0009",
    "botte": "W0010", "botta": "W0010", "otte": "W0010", "votat": "W0010", "vayiru": "W0010", "வயிறு": "W0010", "stomach": "W0010", "belly": "W0010",
    "beralu": "W0011", "berlo": "W0011", "berlu": "W0011", "viral": "W0011", "விரல்": "W0011", "finger": "W0011",
    "monde": "W0012", "mukha": "W0012", "mugam": "W0012", "முகம்": "W0012", "face": "W0012",
    "naaku": "W0013", "naakku": "W0013", "naku": "W0013", "நாக்கு": "W0013", "tongue": "W0013",
    "benna": "W0014", "bennu": "W0014", "muthugu": "W0014", "முதுகு": "W0014", "back": "W0014",
    "mokaalu": "W0015", "mokaal": "W0015", "muzhangkaal": "W0015", "முழங்கால்": "W0015", "knee": "W0015",
    "nenju": "W0016", "nenja": "W0016", "நெஞ்சு": "W0016", "chest": "W0016",
    "koralu": "W0017", "korlu": "W0017", "kazhuthu": "W0017", "கழுத்து": "W0017", "neck": "W0017",
    "tuti": "W0018", "thuti": "W0018", "udhadi": "W0018", "உதடு": "W0018", "lip": "W0018",
    "kanna": "W0019", "kannam": "W0019", "கன்னம்": "W0019", "cheek": "W0019",
    "hani": "W0020", "netti": "W0020", "நெற்றி": "W0020", "forehead": "W0020",
    "tholu": "W0021", "thol": "W0021", "தோள்": "W0021", "shoulder": "W0021",
    "morakai": "W0022", "muzhangkai": "W0022", "முழங்கை": "W0022", "elbow": "W0022",
    "uguru": "W0023", "ugru": "W0023", "nagam": "W0023", "நகம்": "W0023", "nail": "W0023",
    "paadha": "W0025", "paadam": "W0025", "பாதம்": "W0025", "foot": "W0025",
    "pokkulu": "W0036", "pokku": "W0036", "thoppul": "W0036", "தொப்புள்": "W0036", "navel": "W0036",
    "elubu": "W0034", "elumbu": "W0034", "எலும்பு": "W0034", "bone": "W0034",
    "raktha": "W0035", "ratham": "W0035", "ரத்தம்": "W0035", "blood": "W0035",
    # Kinship & Family
    "avve": "W0051", "avva": "W0051", "avv": "W0051", "avvi": "W0051", "amma": "W0051", "maa": "W0051", "அம்மா": "W0051", "mother": "W0051", "mom": "W0051",
    "appa": "W0052", "ayya": "W0052", "bapu": "W0052", "bapuji": "W0052", "அப்பா": "W0052", "father": "W0052", "dad": "W0052",
    "paatti": "W0053", "ajji": "W0053", "dadi": "W0053", "daadi": "W0053", "பாட்டி": "W0053", "grandmother": "W0053",
    "thaatha": "W0054", "ajja": "W0054", "dada": "W0054", "தாத்தா": "W0054", "grandfather": "W0054",
    "anna": "W0055", "அண்ணன்": "W0055", "elder brother": "W0055", "brother": "W0055",
    "akka": "W0056", "அக்கா": "W0056", "elder sister": "W0056", "sister": "W0056",
    "thamma": "W0057", "thambi": "W0057", "தம்பி": "W0057", "younger brother": "W0057",
    "thange": "W0058", "thangai": "W0058", "தங்கை": "W0058", "younger sister": "W0058",
    "mane": "W0101", "veedu": "W0101", "வீடு": "W0101", "house": "W0101", "home": "W0101",
    # Food & Elements
    "neeru": "W0352", "neer": "W0352", "thanni": "W0352", "தண்ணீர்": "W0352", "தண்ணி": "W0352", "water": "W0352",
    "koolu": "W0351", "kool": "W0351", "saadham": "W0351", "சோறு": "W0351", "food": "W0351", "rice": "W0351",
    "haalu": "W0353", "paal": "W0353", "பால்": "W0353", "milk": "W0353",
    "hottu": "W0401", "sooriyan": "W0401", "சூரியன்": "W0401", "sun": "W0401",
    "thingalu": "W0402", "chandran": "W0402", "சந்திரன்": "W0402", "moon": "W0402",
    "male": "W0403", "mazhai": "W0403", "மழை": "W0403", "rain": "W0403",
    "gaali": "W0404", "kaatru": "W0404", "காற்று": "W0404", "wind": "W0404",
    "kicchu": "W0405", "neruppu": "W0405", "thee": "W0405", "நெருப்பு": "W0405", "fire": "W0405",
    "mara": "W0451", "maram": "W0451", "மரம்": "W0451", "tree": "W0451",
    "naayi": "W0501", "naai": "W0501", "நாய்": "W0501", "dog": "W0501",
    "kotti": "W0502", "poonai": "W0502", "பூனை": "W0502", "cat": "W0502",
    "aavu": "W0503", "pasu": "W0503", "பசு": "W0503", "cow": "W0503",
    # Actions & Verbs
    "tinnu": "W0851", "thin": "W0851", "saapidu": "W0851", "சாப்பிடு": "W0851", "eat": "W0851",
    "kudi": "W0852", "குடி": "W0852", "drink": "W0852",
    "ora": "W0853", "thoongu": "W0853", "தூங்கு": "W0853", "sleep": "W0853",
    "baa": "W0854", "vaa": "W0854", "வா": "W0854", "come": "W0854",
    "hogu": "W0855", "po": "W0855", "போ": "W0855", "go": "W0855",
    "kullu": "W0856", "utkaar": "W0856", "உட்கார்": "W0856", "sit": "W0856",
    # Numerals
    "ondu": "W0701", "ondhu": "W0701", "ஒன்று": "W0701", "one": "W0701",
    "eradu": "W0702", "rendu": "W0702", "இரண்டு": "W0702", "two": "W0702",
    "mooru": "W0703", "moonu": "W0703", "மூன்று": "W0703", "three": "W0703",
    "naaku": "W0704", "naangu": "W0704", "நான்கு": "W0704", "four": "W0704",
    "ayidu": "W0705", "anju": "W0705", "ஐந்து": "W0705", "five": "W0705",
    "aaru": "W0706", "ஆறு": "W0706", "six": "W0706",
    "yelu": "W0707", "yezhu": "W0707", "ஏழு": "W0707", "seven": "W0707",
    "ettu": "W0708", "எட்டு": "W0708", "eight": "W0708",
    "ombattu": "W0709", "ஒன்பது": "W0709", "nine": "W0709",
    "hattu": "W0710", "pathu": "W0710", "பத்து": "W0710", "ten": "W0710",
}

# Phonetic dictionary for Marwari dialect terms
MARWARI_PHONETIC_MAP = {
    "maa": "W0051", "ma": "W0051", "mother": "W0051", "mom": "W0051",
    "bapuji": "W0052", "bapu ji": "W0052", "bapu": "W0052", "father": "W0052", "dad": "W0052",
    "daadi": "W0053", "dadi": "W0053", "grandmother": "W0053",
    "dada": "W0054", "grandfather": "W0054",
    "bhaa": "W0055", "bhai": "W0055", "brother": "W0055", "elder brother": "W0055",
    "jiji": "W0056", "didi": "W0056", "sister": "W0056", "elder sister": "W0056",
    "naano bhai": "W0057", "younger brother": "W0057",
    "choti behan": "W0058", "younger sister": "W0058",
    "tabar": "W0059", "baby": "W0059", "child": "W0060",
    "paani": "W0352", "pani": "W0352", "water": "W0352",
}


class LexicalMatcher:
    def __init__(self):
        self._cache = {}
        self._comprehensive_index: Dict[str, Dict[str, Any]] = {}
        self._word_to_aliases: Dict[str, List[str]] = {}
        self._last_mtime = 0
        self._load_comprehensive_index()

    def _load_comprehensive_index(self):
        import os
        import json
        index_path = os.path.abspath("services/recognition/comprehensive_phonetics.json")
        if os.path.exists(index_path):
            try:
                mtime = os.path.getmtime(index_path)
                if self._last_mtime != mtime:
                    with open(index_path, "r", encoding="utf-8") as f:
                        self._comprehensive_index = json.load(f)
                    self._word_to_aliases = {}
                    for alias, info in self._comprehensive_index.items():
                        wid = info.get("word_id")
                        if wid:
                            if wid not in self._word_to_aliases:
                                self._word_to_aliases[wid] = []
                            if len(self._word_to_aliases[wid]) < 25 and alias not in self._word_to_aliases[wid]:
                                self._word_to_aliases[wid].append(alias)
                    self._last_mtime = mtime
            except Exception:
                pass

    def get_aliases_for_word(self, word_id: str, limit: int = 15) -> List[str]:
        self._load_comprehensive_index()
        return self._word_to_aliases.get(word_id, [])[:limit]

    def clean_text(self, text: str) -> str:
        """Removes punctuation, lowers case, and normalizes spacing."""
        if not text:
            return ""
        cleaned = re.sub(r"[^\w\s\u0B80-\u0BFF]", " ", text.lower())
        return " ".join(cleaned.split()).strip()

    def find_match(
        self,
        transcription: str,
        language_code: str = "badaga"
    ) -> Optional[Tuple[Dict[str, Any], float, List[Dict[str, Any]]]]:
        """
        Matches a transcribed utterance against verified vocabulary records.
        Uses 130,000+ precomputed phonetic variants, vowel mutations, and dataset STT.
        """
        self._load_comprehensive_index()
        clean = self.clean_text(transcription)
        if not clean:
            return None

        # Normalize repeated consecutive words (e.g. 'kai kai' -> 'kai', 'mande mande' -> 'mande')
        raw_words = clean.split()
        dedup_list = []
        for w in raw_words:
            if not dedup_list or w != dedup_list[-1]:
                dedup_list.append(w)
        clean_dedup = " ".join(dedup_list).strip()

        clean_no_space = clean.replace(" ", "")
        dedup_no_space = clean_dedup.replace(" ", "")
        lang = language_code.lower().strip()
        phonetic_map = BADAGA_PHONETIC_MAP if lang == "badaga" else MARWARI_PHONETIC_MAP
        fallback_map = MARWARI_PHONETIC_MAP if lang == "badaga" else BADAGA_PHONETIC_MAP
        all_vocab = vocab_store.get_vocabulary(language=lang, limit=3500)

        STOPWORDS = {
            "what", "is", "the", "in", "on", "at", "to", "for", "of", "it", "a", "an",
            "how", "why", "where", "when", "who", "which", "please", "badaga", "marwari",
            "word", "words", "meaning", "means", "pronounce", "explain", "can", "you",
            "me", "tell", "say", "saying", "speak", "does", "do", "did"
        }
        words = [w for w in dedup_list if w not in STOPWORDS and len(w) >= 2]

        # 1. Curated Phonetic Map Match (HIGHEST PRIORITY - preserves core human vocabulary: hand, head, eye, water)
        for key in [clean, clean_dedup, clean_no_space, dedup_no_space]:
            if key in phonetic_map:
                wid = phonetic_map[key]
                target = vocab_store.get_vocabulary_by_id(wid, language=lang)
                if target:
                    return target, 0.99, self._get_alternatives(target, all_vocab)
            if key in fallback_map:
                wid = fallback_map[key]
                target = vocab_store.get_vocabulary_by_id(wid, language=lang)
                if target:
                    return target, 0.95, self._get_alternatives(target, all_vocab)

        # 2. Check each non-stopword token against Curated Phonetic Map
        for w in words:
            if w in phonetic_map:
                wid = phonetic_map[w]
                target = vocab_store.get_vocabulary_by_id(wid, language=lang)
                if target:
                    return target, 0.96, self._get_alternatives(target, all_vocab)
            if w in fallback_map:
                wid = fallback_map[w]
                target = vocab_store.get_vocabulary_by_id(wid, language=lang)
                if target:
                    return target, 0.92, self._get_alternatives(target, all_vocab)

        # 3. Comprehensive Phonetic Index Match
        for key in [clean, clean_dedup, clean_no_space, dedup_no_space]:
            if key in self._comprehensive_index:
                info = self._comprehensive_index[key]
                target = vocab_store.get_vocabulary_by_id(info["word_id"], language=lang)
                if target:
                    weight = float(info.get("weight", 0.95))
                    return target, weight, self._get_alternatives(target, all_vocab)

        # 4. Check each word in transcribed sentence against Comprehensive Index (skipping stopwords)
        for w in words:
            if w in self._comprehensive_index:
                info = self._comprehensive_index[w]
                target = vocab_store.get_vocabulary_by_id(info["word_id"], language=lang)
                if target:
                    weight = float(info.get("weight", 0.93))
                    return target, weight, self._get_alternatives(target, all_vocab)

        # 3. Canonical Vocabulary Exact & Token Matches
        best_item = None
        best_score = 0.0

        for it in all_vocab:
            eng = self.clean_text(it["english_meaning"])
            tam = self.clean_text(it["tamil_meaning"])
            src = self.clean_text(it.get("source_word") or "")
            wid = it["external_word_id"].lower()

            score = 0.0
            if clean == eng or clean == tam or (src and clean == src) or clean == wid:
                score = 1.0
            elif clean_no_space == eng.replace(" ", "") or clean_no_space == tam.replace(" ", ""):
                score = 0.98
            elif clean in eng.split() or eng in words:
                score = 0.94
            elif clean in tam or any(w in tam for w in words):
                score = 0.92
            elif src and (clean in src.split() or any(w in src for w in words)):
                score = 0.92
            else:
                # Fuzzy string similarity
                sim_eng = difflib.SequenceMatcher(None, clean, eng).ratio()
                sim_tam = difflib.SequenceMatcher(None, clean, tam).ratio() if any('\u0B80' <= c <= '\u0BFF' for c in clean) else 0.0
                sim_src = difflib.SequenceMatcher(None, clean, src).ratio() if src else 0.0
                sim_ns_tam = difflib.SequenceMatcher(None, clean_no_space, tam).ratio() if any('\u0B80' <= c <= '\u0BFF' for c in clean_no_space) else 0.0
                score = max(sim_eng, sim_tam, sim_src, sim_ns_tam)

            if score > best_score:
                best_score = score
                best_item = it

        if best_item and best_score >= 0.78:
            return best_item, round(best_score, 4), self._get_alternatives(best_item, all_vocab)

        return None

    def _get_alternatives(
        self,
        target_item: Dict[str, Any],
        all_vocab: List[Dict[str, Any]],
        count: int = 3
    ) -> List[Dict[str, Any]]:
        target_id = target_item["external_word_id"]
        others = [v for v in all_vocab if v["external_word_id"] != target_id]
        return others[:count]


lexical_matcher = LexicalMatcher()
