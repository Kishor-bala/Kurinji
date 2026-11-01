// Phonetic normalization and fuzzy similarity matcher for Badaga & Marwari heritage vocabulary

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
 * Normalizes oral/phonetic variations so that:
 * "Talæ", "taale", "thale", "thalai", "tha + lai" all reduce to "tale"
 */
export function normalizePhonetic(raw: string): string {
  if (!raw) return "";
  let s = raw.toLowerCase().trim();

  // Character substitutions
  s = s
    .replace(/[æä]/g, "e")
    .replace(/[ā]/g, "a")
    .replace(/[ī]/g, "i")
    .replace(/[ū]/g, "u")
    .replace(/[ē]/g, "e")
    .replace(/[ō]/g, "o")
    .replace(/ai/g, "e")
    .replace(/ay/g, "e");

  // Aspirations and consonant groupings
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
    .replace(/rr+/g, "r");

  // Strip non-alphanumeric
  s = s.replace(/[^a-z0-9]/g, "");
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

// Common Badaga oral equivalents for heritage words
const BADAGA_HERITAGE_VARIANTS: Record<string, string[]> = {
  head: ["thale", "taale", "tale", "mandhe", "mande", "talæ", "talai"],
  eye: ["kannu", "kan", "kann"],
  nose: ["moogu", "mooku", "mookku", "mugu"],
  mouth: ["baayi", "bayi", "bay"],
  ear: ["kivi", "kivvi", "sevi"],
  hand: ["kayyi", "kai", "kay"],
  leg: ["kaalu", "kaal", "kalu"],
  water: ["neeru", "neer", "tanni"],
  milk: ["haalu", "paalu", "halu"],
  tree: ["mara", "maram"],
  sun: ["hottu", "sooriyan", "nerupu"],
  house: ["mane", "veedu"],
  mother: ["avve", "amma", "thaai"],
  father: ["appa", "thande"],
};

export function findBestVocabularyMatches(
  query: string,
  languageCode: string,
  records: VocabRecord[],
  limit: number = 6
): MatchResult[] {
  const cleanQ = query.toLowerCase().trim();
  const normQ = normalizePhonetic(cleanQ);

  if (!cleanQ) return [];

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

    // 1. Check if query mentions the English concept (e.g. "what is head in badaga")
    if (cleanQ.includes(engMeaning) || engMeaning.includes(cleanQ)) {
      const score = engMeaning === cleanQ ? 1.0 : 0.92;
      if (score > bestScore) {
        bestScore = score;
        matchedField = "english_meaning";
        matchedPhonetic = engMeaning;
      }
    }

    // 2. Check Tamil meaning
    if (cleanQ.includes(tamMeaning) || tamMeaning.includes(cleanQ)) {
      const score = tamMeaning === cleanQ ? 1.0 : 0.9;
      if (score > bestScore) {
        bestScore = score;
        matchedField = "tamil_meaning";
        matchedPhonetic = tamMeaning;
      }
    }

    // 3. Check Badaga heritage variant mappings (e.g. head -> "taale", "thale", "talæ")
    const variants = BADAGA_HERITAGE_VARIANTS[engMeaning];
    if (variants && variants.length > 0) {
      for (const variant of variants) {
        const vScore = phoneticSimilarity(cleanQ, variant);
        if (vScore > bestScore) {
          bestScore = vScore;
          matchedField = "heritage_variant";
          matchedPhonetic = variant;
        }
      }
    }

    // 4. Check phonetics field (e.g. "tha + lai")
    if (phonetics) {
      const pScore = phoneticSimilarity(cleanQ, phonetics);
      if (pScore > bestScore) {
        bestScore = pScore;
        matchedField = "tamil_phonetics";
        matchedPhonetic = phonetics;
      }
    }

    // 5. Check source word if present
    if (sourceWord) {
      const sScore = phoneticSimilarity(cleanQ, sourceWord);
      if (sScore > bestScore) {
        bestScore = sScore;
        matchedField = "source_word";
        matchedPhonetic = sourceWord;
      }
    }

    // 6. Direct normalized distance against english or external ID
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
