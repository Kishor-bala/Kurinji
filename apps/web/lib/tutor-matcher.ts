// Universal Phonetic, Acoustic & Dialect Matcher for Badaga & Marwari Heritage Vocabulary

export interface VocabRecord {
  id: string;
  external_word_id: string;
  language_code: string;
  language_name: string;
  english_meaning: string;
  tamil_meaning: string;
  tamil_syllables?: string;
  tamil_phonetics?: string;
  source_word?: string | null;
  latin_word?: string | null;
  category?: string;
  audio_assets?: Array<{ audio_url: string; filename?: string }>;
}

export interface MatchResult {
  record: VocabRecord;
  score: number;
  matchedField: string;
  matchedPhonetic: string;
}

/**
 * Normalizes oral/phonetic variations universally across all words:
 * - "Talæ", "taale", "thale", "thalai", "tha + lai" -> "tale"
 * - "kannu", "kann", "kan" -> "kan"
 * - "moogu", "mookku", "mooku" -> "moku"
 * - Proto-Dravidian <-> Badaga initial shift (h- <-> p-) e.g. "hallu" <-> "pallu"
 * - Trailing vowels (-u, -a) optional
 */
export function normalizePhonetic(raw: string): string {
  if (!raw) return "";
  let s = raw.toLowerCase().trim();

  // Character & vowel substitutions
  s = s
    .replace(/[æä]/g, "e")
    .replace(/[ā]/g, "a")
    .replace(/[ī]/g, "i")
    .replace(/[ū]/g, "u")
    .replace(/[ē]/g, "e")
    .replace(/[ō]/g, "o")
    .replace(/ai/g, "e")
    .replace(/ay/g, "e")
    .replace(/ou/g, "o")
    .replace(/au/g, "o");

  // Aspirations & consonant groupings
  s = s
    .replace(/th/g, "t")
    .replace(/dh/g, "d")
    .replace(/zh/g, "l")
    .replace(/ch/g, "s")
    .replace(/sh/g, "s")
    .replace(/kh/g, "k")
    .replace(/ph/g, "p")
    .replace(/bh/g, "b")
    .replace(/gh/g, "g");

  // Badaga initial consonant shifts: initial h <-> p (e.g. hallu/pallu, haalu/paalu)
  if (s.startsWith("h") && s.length > 2) {
    s = "p" + s.slice(1);
  }
  // Badaga b- <-> v- (baayi <-> vaai)
  if (s.startsWith("v") && s.length > 2) {
    s = "b" + s.slice(1);
  }

  // Collapse double consonants and vowels
  s = s
    .replace(/aa+/g, "a")
    .replace(/ee+/g, "e")
    .replace(/ii+/g, "i")
    .replace(/oo+/g, "o")
    .replace(/uu+/g, "u")
    .replace(/ll+/g, "l")
    .replace(/tt+/g, "t")
    .replace(/nn+/g, "n")
    .replace(/kk+/g, "k")
    .replace(/pp+/g, "p")
    .replace(/rr+/g, "r")
    .replace(/yy+/g, "y")
    .replace(/mm+/g, "m");

  // Strip non-alphanumeric
  s = s.replace(/[^a-z0-9]/g, "");

  // Strip optional trailing -u or -i or -e for root comparison (kannu -> kan, kaalu -> kal)
  if (s.length > 3 && s.endsWith("u")) {
    s = s.slice(0, -1);
  }

  return s;
}

/**
 * Consonant skeleton for noisy / acoustic tone prediction.
 * Collapses vowels and approximates sounds so:
 * "neeru", "niru", "neru", "naru", "nara", "nera" all become "nr"
 * "thale", "taale", "tala", "tale", "thala" all become "tl"
 * "kannu", "kan", "kenu", "kina" all become "kn"
 */
export function getConsonantSkeleton(raw: string): string {
  if (!raw) return "";
  const s = normalizePhonetic(raw);
  return s.replace(/[aeiou]/g, "");
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function phoneticSimilarity(a: string, b: string): number {
  const na = normalizePhonetic(a);
  const nb = normalizePhonetic(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.90;

  // Check acoustic tone / consonant skeleton (e.g. niru vs neeru, neru vs neeru)
  const sa = getConsonantSkeleton(a);
  const sb = getConsonantSkeleton(b);
  if (sa && sb && sa === sb && Math.abs(na.length - nb.length) <= 2) {
    return 0.92;
  }

  const dist = levenshteinDistance(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const ratio = 1 - dist / maxLen;
  return Math.max(0, ratio);
}

// Broad cross-lingual aliases (Tamil, Thanglish, English, dialect)
export const CROSS_LINGUAL_ALIASES: Record<string, { badaga: string; marwari: string; english: string }> = {
  thanni: { badaga: "neeru", marwari: "paani", english: "water" },
  tanni: { badaga: "neeru", marwari: "paani", english: "water" },
  water: { badaga: "neeru", marwari: "paani", english: "water" },
  neeru: { badaga: "neeru", marwari: "paani", english: "water" },
  niru: { badaga: "neeru", marwari: "paani", english: "water" },
  neru: { badaga: "neeru", marwari: "paani", english: "water" },
  naru: { badaga: "neeru", marwari: "paani", english: "water" },
  nara: { badaga: "neeru", marwari: "paani", english: "water" },
  nera: { badaga: "neeru", marwari: "paani", english: "water" },
  paani: { badaga: "neeru", marwari: "paani", english: "water" },
  pani: { badaga: "neeru", marwari: "paani", english: "water" },
  thala: { badaga: "thale", marwari: "matho", english: "head" },
  thalai: { badaga: "thale", marwari: "matho", english: "head" },
  thale: { badaga: "thale", marwari: "matho", english: "head" },
  taale: { badaga: "thale", marwari: "matho", english: "head" },
  matho: { badaga: "thale", marwari: "matho", english: "head" },
  head: { badaga: "thale", marwari: "matho", english: "head" },
  kann: { badaga: "kannu", marwari: "aankh", english: "eye" },
  kannu: { badaga: "kannu", marwari: "aankh", english: "eye" },
  kan: { badaga: "kannu", marwari: "aankh", english: "eye" },
  aankh: { badaga: "kannu", marwari: "aankh", english: "eye" },
  eye: { badaga: "kannu", marwari: "aankh", english: "eye" },
  eyes: { badaga: "kannu", marwari: "aankh", english: "eye" },
  mookku: { badaga: "moogu", marwari: "naak", english: "nose" },
  mooku: { badaga: "moogu", marwari: "naak", english: "nose" },
  moogu: { badaga: "moogu", marwari: "naak", english: "nose" },
  naak: { badaga: "moogu", marwari: "naak", english: "nose" },
  nose: { badaga: "moogu", marwari: "naak", english: "nose" },
  vaai: { badaga: "baayi", marwari: "mukh", english: "mouth" },
  baayi: { badaga: "baayi", marwari: "mukh", english: "mouth" },
  mukh: { badaga: "baayi", marwari: "mukh", english: "mouth" },
  mouth: { badaga: "baayi", marwari: "mukh", english: "mouth" },
  kaathu: { badaga: "kivi", marwari: "kaan", english: "ear" },
  sevi: { badaga: "kivi", marwari: "kaan", english: "ear" },
  kivi: { badaga: "kivi", marwari: "kaan", english: "ear" },
  kaan: { badaga: "kivi", marwari: "kaan", english: "ear" },
  ear: { badaga: "kivi", marwari: "kaan", english: "ear" },
  ears: { badaga: "kivi", marwari: "kaan", english: "ear" },
  kai: { badaga: "kayyi", marwari: "haath", english: "hand" },
  kayyi: { badaga: "kayyi", marwari: "haath", english: "hand" },
  haath: { badaga: "kayyi", marwari: "haath", english: "hand" },
  hand: { badaga: "kayyi", marwari: "haath", english: "hand" },
  hands: { badaga: "kayyi", marwari: "haath", english: "hand" },
  kaal: { badaga: "kaalu", marwari: "pag", english: "leg" },
  kaalu: { badaga: "kaalu", marwari: "pag", english: "leg" },
  pag: { badaga: "kaalu", marwari: "pag", english: "leg" },
  leg: { badaga: "kaalu", marwari: "pag", english: "leg" },
  legs: { badaga: "kaalu", marwari: "pag", english: "leg" },
  pallu: { badaga: "hallu", marwari: "daant", english: "teeth" },
  hallu: { badaga: "hallu", marwari: "daant", english: "teeth" },
  daant: { badaga: "hallu", marwari: "daant", english: "teeth" },
  teeth: { badaga: "hallu", marwari: "daant", english: "teeth" },
  tooth: { badaga: "hallu", marwari: "daant", english: "teeth" },
  mudi: { badaga: "koondalu", marwari: "baal", english: "hair" },
  koondalu: { badaga: "koondalu", marwari: "baal", english: "hair" },
  baal: { badaga: "koondalu", marwari: "baal", english: "hair" },
  hair: { badaga: "koondalu", marwari: "baal", english: "hair" },
  paal: { badaga: "haalu", marwari: "doodh", english: "milk" },
  haalu: { badaga: "haalu", marwari: "doodh", english: "milk" },
  doodh: { badaga: "haalu", marwari: "doodh", english: "milk" },
  milk: { badaga: "haalu", marwari: "doodh", english: "milk" },
  maram: { badaga: "mara", marwari: "rookh", english: "tree" },
  mara: { badaga: "mara", marwari: "rookh", english: "tree" },
  rookh: { badaga: "mara", marwari: "rookh", english: "tree" },
  tree: { badaga: "mara", marwari: "rookh", english: "tree" },
  veedu: { badaga: "mane", marwari: "ghar", english: "house" },
  mane: { badaga: "mane", marwari: "ghar", english: "house" },
  ghar: { badaga: "mane", marwari: "ghar", english: "house" },
  house: { badaga: "mane", marwari: "ghar", english: "house" },
  amma: { badaga: "avve", marwari: "Maa", english: "mother" },
  avve: { badaga: "avve", marwari: "Maa", english: "mother" },
  Maa: { badaga: "avve", marwari: "Maa", english: "mother" },
  mother: { badaga: "avve", marwari: "Maa", english: "mother" },
  appa: { badaga: "appa", marwari: "Bapu ji", english: "father" },
  Bapuji: { badaga: "appa", marwari: "Bapu ji", english: "father" },
  father: { badaga: "appa", marwari: "Bapu ji", english: "father" },
  agalu: { badaga: "agalu", marwari: "chaudo", english: "wide" },
  wide: { badaga: "agalu", marwari: "chaudo", english: "wide" },
  broad: { badaga: "agalu", marwari: "chaudo", english: "broad" },
};

/**
 * Universal matcher for ANY word in the database.
 * Supports strict language filtering (badaga, marwari, all)
 * and noise/tone-tolerant phonetic prediction.
 */
export function findBestVocabularyMatches(
  query: string,
  languageCode: string,
  records: VocabRecord[],
  limit: number = 6
): MatchResult[] {
  const cleanQ = query.toLowerCase().trim();
  const normQ = normalizePhonetic(cleanQ);

  if (!cleanQ) return [];

  // Extract query tokens (ignoring stop words)
  const stopWords = new Set(["what", "is", "the", "in", "badaga", "marwari", "how", "to", "say", "tell", "me", "mean", "meaning", "for"]);
  const tokens = cleanQ
    .split(/[\s,?.!+=]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !stopWords.has(w));

  const results: MatchResult[] = [];
  const normalizedLang = languageCode ? languageCode.toLowerCase() : "all";

  // Check cross-lingual aliases first
  let aliasTargetWord = "";
  for (const token of [cleanQ, ...tokens]) {
    const alias = CROSS_LINGUAL_ALIASES[token];
    if (alias) {
      if (normalizedLang === "marwari") {
        aliasTargetWord = alias.marwari;
      } else {
        aliasTargetWord = alias.badaga;
      }
      break;
    }
  }

  for (const item of records) {
    // Strict language filtering
    if (normalizedLang !== "all" && item.language_code.toLowerCase() !== normalizedLang) {
      continue;
    }

    let bestScore = 0;
    let matchedField = "";
    let matchedPhonetic = "";

    const engMeaning = (item.english_meaning || "").toLowerCase();
    const tamMeaning = (item.tamil_meaning || "").toLowerCase();
    const sourceWord = (item.source_word || item.latin_word || "").toLowerCase();
    const latinWord = (item.latin_word || "").toLowerCase();
    const phonetics = (item.tamil_phonetics || "").toLowerCase();
    const syllables = (item.tamil_syllables || "").toLowerCase();

    // 0. Cross-lingual alias match (e.g. "thanni" -> matches Badaga "neeru")
    if (aliasTargetWord) {
      if (sourceWord === aliasTargetWord.toLowerCase() || latinWord === aliasTargetWord.toLowerCase()) {
        bestScore = 1.0;
        matchedField = "cross_lingual_alias";
        matchedPhonetic = aliasTargetWord;
      }
    }

    // 1. Latin Badaglish / Marwarish match (source_word or latin_word)
    if (sourceWord || latinWord) {
      const target = sourceWord || latinWord;
      const sScore = phoneticSimilarity(cleanQ, target);
      if (sScore > bestScore) {
        bestScore = sScore;
        matchedField = "latin_word";
        matchedPhonetic = target;
      }
      for (const t of tokens) {
        const tScore = phoneticSimilarity(t, target);
        if (tScore > bestScore) {
          bestScore = tScore;
          matchedField = "latin_word_token";
          matchedPhonetic = target;
        }
      }
    }

    // 2. English concept match
    if (cleanQ.includes(engMeaning) || engMeaning.includes(cleanQ)) {
      const score = engMeaning === cleanQ ? 1.0 : 0.94;
      if (score > bestScore) {
        bestScore = score;
        matchedField = "english_meaning";
        matchedPhonetic = engMeaning;
      }
    }
    for (const t of tokens) {
      if (t === engMeaning || engMeaning.split(/\s+/).includes(t)) {
        if (0.93 > bestScore) {
          bestScore = 0.93;
          matchedField = "english_meaning_token";
          matchedPhonetic = engMeaning;
        }
      }
    }

    // 3. Tamil meaning match
    if (cleanQ.includes(tamMeaning) || tamMeaning.includes(cleanQ)) {
      const score = tamMeaning === cleanQ ? 1.0 : 0.92;
      if (score > bestScore) {
        bestScore = score;
        matchedField = "tamil_meaning";
        matchedPhonetic = tamMeaning;
      }
    }

    // 4. Phonetics field
    if (phonetics) {
      let pScore = phoneticSimilarity(cleanQ, phonetics);
      for (const t of tokens) {
        const tScore = phoneticSimilarity(t, phonetics);
        if (tScore > pScore) pScore = tScore;
      }
      if (pScore > bestScore) {
        bestScore = pScore;
        matchedField = "tamil_phonetics";
        matchedPhonetic = phonetics;
      }
    }

    // 5. Syllables field
    if (syllables) {
      const sScore = phoneticSimilarity(cleanQ, syllables.replace(/\+/g, ""));
      if (sScore > bestScore) {
        bestScore = sScore;
        matchedField = "tamil_syllables";
        matchedPhonetic = syllables;
      }
    }

    // 6. External word ID match
    if (normQ && item.external_word_id.toLowerCase().includes(normQ)) {
      if (0.85 > bestScore) {
        bestScore = 0.85;
        matchedField = "external_word_id";
        matchedPhonetic = item.external_word_id;
      }
    }

    if (bestScore >= 0.55) {
      results.push({
        record: item,
        score: bestScore,
        matchedField,
        matchedPhonetic,
      });
    }
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}
