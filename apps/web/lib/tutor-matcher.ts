// Universal Phonetic & Dialect Similarity Matcher for All Badaga & Marwari Vocabulary

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
  if (na.includes(nb) || nb.includes(na)) return 0.88;

  const dist = levenshteinDistance(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const ratio = 1 - dist / maxLen;
  return Math.max(0, ratio);
}

// Broad heritage mappings for prominent Badaga vocabulary
const BADAGA_HERITAGE_VARIANTS: Record<string, string[]> = {
  head: ["thale", "taale", "tale", "mandhe", "mande", "talæ", "talai"],
  eye: ["kannu", "kan", "kann", "kanni"],
  eyes: ["kannu", "kan", "kann"],
  nose: ["moogu", "mooku", "mookku", "mugu"],
  mouth: ["baayi", "bayi", "bay", "vaai"],
  ear: ["kivi", "kivvi", "sevi", "kevi"],
  ears: ["kivi", "kivvi", "sevi"],
  hand: ["kayyi", "kai", "kay", "key"],
  hands: ["kayyi", "kai", "kay"],
  leg: ["kaalu", "kaal", "kalu"],
  legs: ["kaalu", "kaal", "kalu"],
  tooth: ["hallu", "pallu", "pal"],
  teeth: ["hallu", "pallu", "pal"],
  tongue: ["naalange", "naakku", "naku"],
  hair: ["koondalu", "mudhi", "mayire"],
  stomach: ["hotte", "potte", "vayiru"],
  water: ["neeru", "neer", "tanni", "neru"],
  milk: ["haalu", "paalu", "halu", "palu"],
  tree: ["mara", "maram", "maro"],
  sun: ["hottu", "sooriyan", "soorya", "nerupu"],
  moon: ["tingalu", "chandiran", "nila"],
  house: ["mane", "veedu", "mann"],
  village: ["hatti", "oor", "ooru"],
  mother: ["avve", "amma", "thaai", "aye"],
  father: ["appa", "thande", "bappa"],
  brother: ["anna", "thambi", "dhodda"],
  sister: ["akka", "thangai"],
  food: ["oota", "saapadu", "thindi"],
  dog: ["naayi", "nayi"],
  cat: ["bekku", "poonai"],
  cow: ["aavu", "maadu", "dana"],
  tiger: ["huli", "puli"],
  bird: ["hakki", "paravai"],
  flower: ["hoovu", "poovu", "poo"],
  one: ["ondu", "onnu"],
  two: ["eradu", "rendu"],
  three: ["mooru", "moonu"],
  four: ["naaku", "naalu"],
  five: ["aidhu", "anju"],
  six: ["aaru"],
  seven: ["yelu", "ezhu"],
  eight: ["entu", "ettu"],
  nine: ["ombathu"],
  ten: ["hathu", "pathu"],
};

/**
 * Universal matcher for ANY word in the database.
 * Tests full phrases as well as individual tokens.
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
    .split(/[\s,?.!]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !stopWords.has(w));

  const results: MatchResult[] = [];

  for (const item of records) {
    if (languageCode !== "all" && item.language_code !== languageCode) {
      continue;
    }

    let bestScore = 0;
    let matchedField = "";
    let matchedPhonetic = "";

    const engMeaning = (item.english_meaning || "").toLowerCase();
    const tamMeaning = (item.tamil_meaning || "").toLowerCase();
    const sourceWord = (item.source_word || "").toLowerCase();
    const phonetics = (item.tamil_phonetics || "").toLowerCase();
    const syllables = (item.tamil_syllables || "").toLowerCase();

    // 1. English concept match (full query and tokens)
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
        if (0.92 > bestScore) {
          bestScore = 0.92;
          matchedField = "english_meaning_token";
          matchedPhonetic = engMeaning;
        }
      }
    }

    // 2. Tamil meaning match
    if (cleanQ.includes(tamMeaning) || tamMeaning.includes(cleanQ)) {
      const score = tamMeaning === cleanQ ? 1.0 : 0.92;
      if (score > bestScore) {
        bestScore = score;
        matchedField = "tamil_meaning";
        matchedPhonetic = tamMeaning;
      }
    }

    // 3. Heritage variants dictionary (for common oral shifts)
    const variants = BADAGA_HERITAGE_VARIANTS[engMeaning];
    if (variants && variants.length > 0) {
      for (const variant of variants) {
        // Compare with full query
        let vScore = phoneticSimilarity(cleanQ, variant);
        // Compare with individual tokens
        for (const t of tokens) {
          const tScore = phoneticSimilarity(t, variant);
          if (tScore > vScore) vScore = tScore;
        }
        if (vScore > bestScore) {
          bestScore = vScore;
          matchedField = "heritage_variant";
          matchedPhonetic = variant;
        }
      }
    }

    // 4. Universal phonetics comparison for ANY word in dataset
    if (phonetics) {
      // Compare full query
      let pScore = phoneticSimilarity(cleanQ, phonetics);
      // Compare tokens
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

    // 5. Syllables comparison for ANY word
    if (syllables) {
      const sScore = phoneticSimilarity(cleanQ, syllables.replace(/\+/g, ""));
      if (sScore > bestScore) {
        bestScore = sScore;
        matchedField = "tamil_syllables";
        matchedPhonetic = syllables;
      }
    }

    // 6. Source word comparison for ANY word
    if (sourceWord) {
      let swScore = phoneticSimilarity(cleanQ, sourceWord);
      for (const t of tokens) {
        const tScore = phoneticSimilarity(t, sourceWord);
        if (tScore > swScore) swScore = tScore;
      }
      if (swScore > bestScore) {
        bestScore = swScore;
        matchedField = "source_word";
        matchedPhonetic = sourceWord;
      }
    }

    // 7. External word ID match (e.g. W0001)
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
