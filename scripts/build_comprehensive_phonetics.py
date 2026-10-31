"""
Comprehensive Phonetic and Pronunciation Variant Generator.
Builds a massive reverse-lookup index mapping any dialect variation,
vowel mutation (thala, thale, thele), Tamil transliteration, English synonym,
or native Whisper STT transcription to its canonical Word ID.
"""

import os
import re
import json
from typing import Dict, Set, List, Any
from services.vector_store.vocab_store import vocab_store


TAMIL_VOWELS = {
    "அ": "a", "ஆ": "aa", "இ": "i", "ஈ": "ee", "உ": "u", "ஊ": "oo",
    "எ": "e", "ஏ": "ee", "ஐ": "ai", "ஒ": "o", "ஓ": "oo", "ஔ": "au"
}
TAMIL_CONSONANTS = {
    "க": "k", "ங": "ng", "ச": "s", "ஞ": "ny", "ட": "t", "ண": "n",
    "த": "th", "ந": "n", "ப": "p", "ம": "m", "ய": "y", "ர": "r",
    "ல": "l", "வ": "v", "ழ": "zh", "ள": "l", "ற": "r", "ன": "n"
}
TAMIL_MATRAS = {
    "ா": "aa", "ி": "i", "ீ": "ee", "ு": "u", "ூ": "oo",
    "ெ": "e", "ே": "ee", "ை": "ai", "ொ": "o", "ோ": "oo", "ௌ": "au",
    "்": ""
}

def clean_term(text: str) -> str:
    cleaned = re.sub(r"[^\w\s\u0B80-\u0BFF]", " ", text.lower())
    return " ".join(cleaned.split()).strip()

def transliterate_tamil(text: str) -> str:
    out = []
    i = 0
    chars = list(text.strip())
    n = len(chars)
    while i < n:
        c = chars[i]
        if c in TAMIL_VOWELS:
            out.append(TAMIL_VOWELS[c])
            i += 1
        elif c in TAMIL_CONSONANTS:
            cons = TAMIL_CONSONANTS[c]
            if i + 1 < n and chars[i+1] in TAMIL_MATRAS:
                matra = chars[i+1]
                vowel = TAMIL_MATRAS[matra]
                out.append(cons + vowel)
                i += 2
            else:
                out.append(cons + "a")
                i += 1
        elif c in " \t\n-,()":
            out.append(c)
            i += 1
        else:
            i += 1
    return "".join(out).strip()

def generate_vowel_mutations(word: str) -> Set[str]:
    """
    Generates linguistic vowel raising/mutation variants.
    e.g. thala -> thale, thele, tala, tale, tele, dala, dale, dele.
    """
    w = word.lower().strip()
    if not w or len(w) < 2:
        return {w} if w else set()

    variants = {w}

    # -ai endings -> -a, -e, -i, -ey, -ay
    if w.endswith("ai"):
        base = w[:-2]
        variants.update([base + "a", base + "e", base + "i", base + "ey", base + "ay"])
    elif w.endswith("a"):
        base = w[:-1]
        variants.update([base + "e", base + "i", base + "ai", base + "ey"])
    elif w.endswith("e"):
        base = w[:-1]
        variants.update([base + "a", base + "i", base + "ai", base + "ey"])
    elif w.endswith("u"):
        base = w[:-1]
        variants.update([base, base + "o", base + "oo", base + "i", base + "e", base + "a"])
    elif w.endswith("i"):
        base = w[:-1]
        variants.update([base + "e", base + "a", base + "ee", base + "ai"])

    more = set()
    for v in list(variants):
        # Initial consonant variations (dental/retroflex/voiced)
        if v.startswith("th"):
            more.add("t" + v[2:])
            more.add("d" + v[2:])
        elif v.startswith("t"):
            more.add("th" + v[1:])
            more.add("d" + v[1:])
        elif v.startswith("d"):
            more.add("th" + v[1:])
            more.add("t" + v[1:])

        # v <-> b <-> w (e.g. kivi <-> kiwi <-> kibi, vaai <-> baayi)
        if "v" in v:
            more.add(v.replace("v", "b"))
            more.add(v.replace("v", "w"))
        if "w" in v:
            more.add(v.replace("w", "v"))
            more.add(v.replace("w", "b"))
        if "b" in v:
            more.add(v.replace("b", "v"))

        # p <-> h (Badaga/Old Kannada p -> h shift, e.g. pallu -> hallu)
        if v.startswith("p"):
            more.add("h" + v[1:])
        elif v.startswith("h"):
            more.add("p" + v[1:])

        # Vowel raising / harmony (e.g. thala -> thele, thale; dala -> dele)
        if "a" in v and len(v) >= 3:
            more.add(v.replace("a", "e"))
            # replace first vowel or second vowel
            parts = v.split("a")
            if len(parts) == 3:  # two 'a's, e.g. th-a-l-a
                more.add(parts[0] + "e" + parts[1] + "e" + parts[2])
                more.add(parts[0] + "a" + parts[1] + "e" + parts[2])
                more.add(parts[0] + "e" + parts[1] + "a" + parts[2])

        # Double consonants <-> single (kannu <-> kanu, mookku <-> mooku)
        for dbl in ["kk", "tt", "pp", "ll", "nn", "mm"]:
            if dbl in v:
                more.add(v.replace(dbl, dbl[0]))
            elif dbl[0] in v and not dbl in v:
                more.add(v.replace(dbl[0], dbl, 1))

    variants.update(more)
    # Filter out empty or too short strings
    return {v for v in variants if len(v) >= 2}


# Curated core Badaga & Marwari heritage vocabulary mapping
EXPLICIT_HERITAGE_TERMS = {
    # W0001 Head / தலை
    "W0001": ["mandai", "mande", "mandi", "mandoo", "mandu", "mando", "dalai", "dala", "dale", "dele", "thalai", "thala", "thale", "thele", "talai", "tala", "tale", "tele", "தல", "தாலை", "மண்டை", "மண்டே"],
    # W0002 Eye / கண்
    "W0002": ["kannu", "kann", "kan", "kanno", "kannoo", "kanni", "kani", "kaani", "kaan", "கண்ணு", "காணி", "கண்ண"],
    # W0003 Nose / மூக்கு
    "W0003": ["mooku", "mookku", "muku", "mukku", "mooko", "mookoo", "மூக்கும்", "முக்கு"],
    # W0004 Mouth / வாய்
    "W0004": ["bayi", "baayi", "baai", "bay", "baye", "vaai", "vai", "vay"],
    # W0005 Ear / காது
    "W0005": ["kivi", "kiwi", "kive", "keevi", "kibi", "kibih", "kaadhu", "kaathu", "கிவி", "கிபி"],
    # W0006 Hand / கை
    "W0006": ["kai", "kayyi", "kayi", "key", "kay", "கை"],
    # W0007 Leg / கால்
    "W0007": ["kaal", "kaalu", "kaalo", "kaaloo", "kal", "கால்"],
    # W0008 Teeth / பல்
    "W0008": ["hallu", "hall", "pallu", "pal", "hallo", "halloo", "பல்", "பல்லு"],
    # W0009 Hair / முடி
    "W0009": ["koodalu", "koodal", "kodalu", "mudi", "mudy", "முடி"],
    # W0010 Stomach / வயிறு
    "W0010": ["botte", "botta", "botti", "otte", "otta", "votat", "votte", "votta", "vayiru", "வயிறு"],
    # W0011 Finger / விரல்
    "W0011": ["beralu", "beral", "berlo", "berla", "viral", "veral", "விரல்"],
    # W0012 Face / முகம்
    "W0012": ["monde", "mondu", "munde", "mukha", "muka", "mugam", "mukam", "மொண்டு", "முகம்"],
    # W0013 Tongue / நாக்கு
    "W0013": ["naaku", "naakku", "nakku", "naku", "nadoo", "nadu", "naako", "நாக்கு"],
    # W0014 Back / முதுகு
    "W0014": ["benna", "bennu", "muthugu", "mudhugu", "முதுகு"],
    # W0015 Knee / முழங்கால்
    "W0015": ["mokaalu", "mokaal", "muzhangkaal", "முழங்கால்"],
    # W0051 Mother / அம்மா
    "W0051": ["avve", "avva", "avv", "avvi", "avvikku", "avikku", "a vex", "maa", "ma", "maaji", "amma", "ammaa", "அம்மா", "அவ்வை", "அவிக்கு"],
    # W0052 Father / அப்பா
    "W0052": ["appa", "appaa", "ayya", "bapu", "bapuji", "bapu ji", "baap", "pita", "அப்பா", "அய்யா"],
    # W0053 Grandmother / பாட்டி
    "W0053": ["paatti", "patti", "dadi", "daadi", "பாட்டி"],
    # W0054 Grandfather / தாத்தா
    "W0054": ["thaatha", "thatha", "dada", "daada", "தாத்தா"],
    # W0055 Elder Brother / அண்ணன்
    "W0055": ["annan", "anna", "annaa", "bhaa", "bhai", "bhaiya", "அண்ணன்"],
    # W0056 Elder Sister / அக்கா
    "W0056": ["akka", "akkaa", "jiji", "didi", "அக்கா"],
    # W0057 Younger Brother / தம்பி
    "W0057": ["thambi", "thamby", "thamma", "naano bhai", "தம்பி"],
    # W0058 Younger Sister / தங்கை
    "W0058": ["thangai", "thanga", "thange", "choti behan", "தங்கை"],
    # W0059 Baby / பாப்பா
    "W0059": ["tabar", "baccha", "paapaa", "paappa", "பாப்பா"],
    # W0060 Child / குழந்தை
    "W0060": ["tabar", "kulandhai", "kozhondha", "குழந்தை"],
    # W0101 House / வீடு
    "W0101": ["mane", "mani", "maney", "veedu", "veetu", "வீடு"],
    # W0352 Water / தண்ணீர்
    "W0352": ["paani", "pani", "thanneer", "thanni", "tanni", "neeru", "neer", "தண்ணீர்", "தண்ணி"],
    # W0851 Eat / சாப்பிடு
    "W0851": ["tinnu", "tinna", "thin", "thinna", "saapidu", "saapdu", "சாப்பிடு"],
    # W0852 Drink / குடி
    "W0852": ["kudi", "kudy", "kude", "peeyo", "குடி"],
    # W0853 Sleep / தூங்கு
    "W0853": ["thoongu", "thungu", "ora", "ore", "soro", "தூங்கு"],
    # W0854 Come / வா
    "W0854": ["vaa", "baa", "ba", "aao", "வா"],
    # W0855 Go / போ
    "W0855": ["po", "poo", "hogu", "hogo", "jaao", "போ"],
    # W0856 Sit / உட்கார்
    "W0856": ["kullu", "kulla", "utkaar", "ukkandhu", "baitho", "உட்கார்"],
    # W0858 Walk / நட
    "W0858": ["nada", "nade", "nadu", "nadoo", "nata", "chalo", "நட"],
    # Numbers
    "W0701": ["ondu", "ondhu", "onnu", "ondru", "ek", "ஒன்று", "ஒன்னு"],
    "W0702": ["eradu", "rendu", "irandu", "do", "இரண்டு", "ரெண்டு"],
    "W0703": ["mooru", "moonu", "moondru", "teen", "மூன்று", "மூனு"],
    "W0704": ["naaku", "naangu", "naalu", "char", "நான்கு", "நாலு"],
    "W0705": ["ayidu", "anju", "aindhu", "paanch", "ஐந்து", "அஞ்சு"],
    "W0706": ["aaru", "aar", "chhe", "ஆறு"],
    "W0707": ["yelu", "yezhu", "saath", "ஏழு"],
    "W0708": ["ettu", "aat", "எட்டு"],
    "W0709": ["ombattu", "onbadhu", "nau", "ஒன்பது"],
    "W0710": ["hattu", "pathu", "patthu", "das", "பத்து"],
}

# English homophones and common Whisper misrecognitions
ENGLISH_HOMOPHONES = {
    "eye": ["i", "aye", "eye"],
    "hear": ["here", "hear"],
    "sea": ["see", "sea"],
    "sun": ["son", "sun"],
    "one": ["won", "wone", "one"],
    "two": ["to", "too", "two"],
    "four": ["for", "fore", "four"],
    "eight": ["ate", "eight"],
    "right": ["write", "right"],
    "head": ["ahead", "head"],
    "nose": ["knows", "nose"],
    "hair": ["hare", "hair"],
    "meat": ["meet", "meat"],
    "buy": ["by", "bye", "buy"],
}


def build_comprehensive_index():
    print("Building Comprehensive Phonetic Index...")
    all_vocab = vocab_store.get_vocabulary(limit=10000)
    print(f"Loaded {len(all_vocab)} vocabulary records.")

    # Load dataset STT transcriptions if available
    stt_data = {}
    stt_file = "storage/dataset_stt_transcriptions.json"
    if os.path.exists(stt_file):
        try:
            with open(stt_file, "r", encoding="utf-8") as f:
                stt_data = json.load(f)
            print(f"Loaded {len(stt_data)} dataset STT transcriptions.")
        except Exception as e:
            print(f"Failed to read {stt_file}: {e}")

    # Reverse lookup map: normalized_alias -> word_record
    reverse_map: Dict[str, Dict[str, Any]] = {}
    total_aliases = 0

    STOPWORDS = {
        "what", "is", "the", "in", "on", "at", "to", "for", "of", "it", "a", "an",
        "how", "why", "where", "when", "who", "which", "please", "badaga", "marwari",
        "word", "words", "meaning", "means", "pronounce", "explain", "can", "you",
        "me", "say", "saying", "speak", "does", "do", "did"
    }

    def add_alias(alias: str, word_item: Dict[str, Any], weight: float = 1.0):
        nonlocal total_aliases
        a_clean = clean_term(alias)
        if not a_clean or len(a_clean) < 2:
            return
        if a_clean in STOPWORDS and a_clean != word_item["english_meaning"].lower():
            return

        wid = word_item["external_word_id"]
        lang = word_item["language_code"]
        entry = {
            "word_id": wid,
            "language_code": lang,
            "english_meaning": word_item["english_meaning"],
            "tamil_meaning": word_item["tamil_meaning"],
            "source_word": word_item.get("source_word"),
            "weight": weight
        }

        # Space-separated
        if a_clean not in reverse_map or weight > reverse_map[a_clean]["weight"]:
            reverse_map[a_clean] = entry
            total_aliases += 1

        # Unspaced variation (e.g. 'tala i' -> 'talai')
        ns = a_clean.replace(" ", "")
        if len(ns) >= 2 and (ns not in reverse_map or weight > reverse_map[ns]["weight"]):
            reverse_map[ns] = entry
            total_aliases += 1

    for it in all_vocab:
        wid = it["external_word_id"]
        lang = it["language_code"]
        eng = it["english_meaning"]
        tam = it["tamil_meaning"]
        src = it.get("source_word")

        # 1. Exact canonical terms
        add_alias(eng, it, weight=1.0)
        if ";" in eng:
            for sense_part in eng.split(";"):
                add_alias(sense_part.strip(), it, weight=0.98)
        add_alias(tam, it, weight=1.0)
        if src:
            add_alias(src, it, weight=1.0)
            # Mutations on source word
            for mut in generate_vowel_mutations(src):
                add_alias(mut, it, weight=0.95)
            # Add individual tokens if multi-word (e.g. 'kai sandu' -> 'sandu')
            for st in src.split():
                if len(st) >= 3 and st != src:
                    add_alias(st, it, weight=0.93)

        # 2. English homophones
        eng_clean = clean_term(eng)
        if eng_clean in ENGLISH_HOMOPHONES:
            for homo in ENGLISH_HOMOPHONES[eng_clean]:
                add_alias(homo, it, weight=0.98)

        # 3. Transliterate Tamil meaning & generate mutations (thala, thale, thele...)
        # Clean bracketed notes like 'ஆறு (6)' -> 'ஆறு'
        tam_clean = re.sub(r"\(.*?\)", "", tam).strip()
        if tam_clean:
            rom = transliterate_tamil(tam_clean)
            if rom:
                add_alias(rom, it, weight=0.98)
                for mut in generate_vowel_mutations(rom):
                    add_alias(mut, it, weight=0.95)

        # 4. Explicit Heritage Terms (curated Badaga & Marwari)
        if wid in EXPLICIT_HERITAGE_TERMS:
            for term in EXPLICIT_HERITAGE_TERMS[wid]:
                add_alias(term, it, weight=0.99)
                for mut in generate_vowel_mutations(term):
                    add_alias(mut, it, weight=0.95)

        # 5. Spoken transcriptions captured by Whisper from actual native audio
        stt_key = f"{lang}_{wid}"
        if stt_key in stt_data:
            item_stt = stt_data[stt_key]
            for tr in item_stt.get("spoken_transcriptions", []):
                txt = tr.get("clean_text") or tr.get("raw_text")
                if txt:
                    add_alias(txt, it, weight=0.98)
                    for mut in generate_vowel_mutations(txt):
                        add_alias(mut, it, weight=0.95)

                    # Deduplicate repeated words or halves (e.g. "hendro hendro" -> "hendro", "mola kodi mola kodi" -> "mola kodi")
                    tokens = txt.split()
                    n_tok = len(tokens)
                    if n_tok >= 2 and n_tok % 2 == 0:
                        half = n_tok // 2
                        if tokens[:half] == tokens[half:]:
                            half_phrase = " ".join(tokens[:half])
                            add_alias(half_phrase, it, weight=0.98)
                            for mut in generate_vowel_mutations(half_phrase):
                                add_alias(mut, it, weight=0.95)

                    # Add individual words if phrase
                    for w in tokens:
                        if len(w) >= 3:
                            add_alias(w, it, weight=0.96)
                            for mut in generate_vowel_mutations(w):
                                add_alias(mut, it, weight=0.94)

    output_path = "services/recognition/comprehensive_phonetics.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(reverse_map, f, ensure_ascii=False, indent=2)

    print(f"Generated {len(reverse_map)} unique phonetic aliases and pronunciation variants across all 499 words!")
    print(f"Saved index to {output_path}")

if __name__ == "__main__":
    build_comprehensive_index()
