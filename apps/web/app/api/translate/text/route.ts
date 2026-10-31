import { NextRequest, NextResponse } from "next/server";
import kurinjiVocabData from "@/public/data/kurinji_vocabulary.json";

interface KurinjiEntry {
  word_id: string;
  language: string;
  tamil_meaning: string;
  english_meaning: string;
  optional_romanised_pronunciation?: string;
  notes?: string;
  clips?: string[];
}

function getKurinjiData(): KurinjiEntry[] {
  return kurinjiVocabData as KurinjiEntry[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const queryText = (body.text || "").trim().toLowerCase();
    const language = (body.language || "Badaga").trim();
    const targetLang = language === "Marwari" ? "Marwari" : "Badaga";

    if (!queryText) {
      return NextResponse.json({
        status: "unknown",
        word_id: null,
        language: targetLang,
        tamil_meaning: null,
        english_meaning: null,
        similarity: 0.0,
        margin: 0.0,
        message: "Please enter a word to translate.",
        ranked_candidates: [],
      });
    }

    const allVocab = getKurinjiData();
    const langVocab = allVocab.filter(
      (e) => e.language.toLowerCase() === targetLang.toLowerCase()
    );

    // 1. Direct Search in closed-vocabulary database
    // Exact English meaning match, Word ID match, or romanised transliteration match
    let directMatch: KurinjiEntry | undefined = langVocab.find(
      (e) =>
        e.word_id.toLowerCase() === queryText ||
        e.english_meaning.toLowerCase() === queryText ||
        e.tamil_meaning === queryText
    );

    if (!directMatch) {
      // Check romanised transliterations in optional_romanised_pronunciation
      directMatch = langVocab.find((e) => {
        if (!e.optional_romanised_pronunciation) return false;
        const variants = e.optional_romanised_pronunciation
          .toLowerCase()
          .split(/[,;/|]+/)
          .map((v) => v.trim());
        return variants.includes(queryText) || variants.some((v) => v === queryText);
      });
    }

    // Partial/prefix match on romanised pronunciation
    if (!directMatch) {
      directMatch = langVocab.find((e) => {
        if (!e.optional_romanised_pronunciation) return false;
        const variants = e.optional_romanised_pronunciation
          .toLowerCase()
          .split(/[,;/|]+/)
          .map((v) => v.trim());
        return variants.some((v) => v.startsWith(queryText) || queryText.startsWith(v));
      });
    }

    if (directMatch) {
      const clipMatches = (directMatch.clips || []).map((cid) => ({
        clip_id: cid,
        similarity: 1.0,
      }));

      return NextResponse.json({
        status: "recognized",
        word_id: directMatch.word_id,
        language: directMatch.language,
        tamil_meaning: directMatch.tamil_meaning,
        english_meaning: directMatch.english_meaning,
        similarity: 1.0,
        margin: 0.2,
        message: `Direct vocabulary match for '${queryText}'.`,
        ranked_candidates: [
          {
            word_id: directMatch.word_id,
            language: directMatch.language,
            tamil_meaning: directMatch.tamil_meaning,
            english_meaning: directMatch.english_meaning,
            score: 1.0,
            clip_matches: clipMatches,
          },
        ],
      });
    }

    // 2. If no direct match, query Gemini for phonetic matching against the closed wordbank
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.length > 10 && !geminiKey.startsWith("YOUR_")) {
      try {
        const wordbankLines = langVocab
          .slice(0, 400)
          .map(
            (e) =>
              `${e.word_id}: ${e.english_meaning} | ${e.tamil_meaning}${
                e.optional_romanised_pronunciation
                  ? ` [pronunciation: ${e.optional_romanised_pronunciation}]`
                  : ""
              }`
          )
          .join("\n");

        const prompt = `The user typed a spoken ${targetLang} word in English transliteration / phonetic script: "${queryText}".
Match this phonetically to the most appropriate Word ID from this closed-vocabulary wordbank:

${wordbankLines}

Instructions:
1. Consider phonetic variations:
   Badaga: 'thale' / 'mandhe' / 'tale' -> head; 'kannu' / 'kanna' -> eye; 'mooku' -> nose; 'pal' -> teeth; 'kaalu' -> leg; 'kai' -> hand; 'amma' -> mother.
   Marwari: 'aankh' -> eye; 'naak' -> nose; 'daant' -> teeth; 'matho' -> head; 'haath' -> hand; 'pag' -> leg; 'maa' -> mother.
2. Return ONLY a JSON object:
{"word_id": "WORD_ID_OR_NULL", "confidence": FLOAT, "explanation": "Brief explanation"}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            const matchedWid = parsed.word_id;
            const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.85;

            if (matchedWid) {
              const matchedEntry = langVocab.find((e) => e.word_id === matchedWid);
              if (matchedEntry) {
                const clipMatches = (matchedEntry.clips || []).map((cid) => ({
                  clip_id: cid,
                  similarity: confidence,
                }));

                return NextResponse.json({
                  status: confidence >= 0.5 ? "recognized" : "uncertain",
                  word_id: matchedEntry.word_id,
                  language: matchedEntry.language,
                  tamil_meaning: matchedEntry.tamil_meaning,
                  english_meaning: matchedEntry.english_meaning,
                  similarity: confidence,
                  margin: 0.15,
                  message: `Transliteration match: ${parsed.explanation || ""}`,
                  ranked_candidates: [
                    {
                      word_id: matchedEntry.word_id,
                      language: matchedEntry.language,
                      tamil_meaning: matchedEntry.tamil_meaning,
                      english_meaning: matchedEntry.english_meaning,
                      score: confidence,
                      clip_matches: clipMatches,
                    },
                  ],
                });
              }
            }
          }
        }
      } catch (gErr) {
        console.warn("Gemini transliteration fallback error:", gErr);
      }
    }

    // 3. Fallback: closest candidate
    const closest = langVocab[0];
    return NextResponse.json({
      status: "unknown",
      word_id: null,
      language: targetLang,
      tamil_meaning: null,
      english_meaning: null,
      similarity: 0.25,
      margin: 0.0,
      message: `No confident match found for '${queryText}' in verified ${targetLang} wordbank.`,
      ranked_candidates: closest
        ? [
            {
              word_id: closest.word_id,
              language: closest.language,
              tamil_meaning: closest.tamil_meaning,
              english_meaning: closest.english_meaning,
              score: 0.25,
              clip_matches: (closest.clips || []).map((c) => ({ clip_id: c, similarity: 0.25 })),
            },
          ]
        : [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { status: "unknown", message: msg, similarity: 0.0, ranked_candidates: [] },
      { status: 500 }
    );
  }
}
