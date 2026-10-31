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
    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;
    const languageParam = (formData.get("language") as string | null) || "Badaga";
    const targetLang = languageParam.trim() === "Marwari" ? "Marwari" : "Badaga";

    if (!file) {
      return NextResponse.json(
        { status: "invalid_audio", message: "Audio file is required." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 200) {
      return NextResponse.json({
        status: "excessive_silence",
        message: "Audio recording contains excessive silence or inaudible speech.",
        similarity: 0.0,
      });
    }

    const allVocab = getKurinjiData();
    const langVocab = allVocab.filter(
      (e) => e.language.toLowerCase() === targetLang.toLowerCase()
    );

    // 1. Try Gemini Multimodal Audio AI Recognition
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.length > 10 && !geminiKey.startsWith("YOUR_")) {
      try {
        const base64Audio = buffer.toString("base64");
        const mimeType = file.type && file.type.includes("audio") ? file.type : "audio/wav";

        const wordbankLines = langVocab
          .slice(0, 450)
          .map(
            (e) =>
              `${e.word_id}: ${e.english_meaning} | ${e.tamil_meaning}${
                e.optional_romanised_pronunciation
                  ? ` [pronunciation: ${e.optional_romanised_pronunciation}]`
                  : ""
              }`
          )
          .join("\n");

        const prompt = `You are an acoustic phonetics expert specializing in the low-resource Indian languages Badaga and Marwari.
Attached is a short audio recording of a user pronouncing a single word in ${targetLang}.
Your task is to identify which word from the following verified closed-vocabulary wordbank was spoken:

--- BEGIN VERIFIED WORDBANK ---
${wordbankLines}
--- END VERIFIED WORDBANK ---

Instructions:
1. Listen carefully to the acoustic speech sounds, consonants, vowels, and syllable phonemes.
2. The speaker is pronouncing a native word in ${targetLang}, NOT an English word!
   - Badaga (Dravidian hill language): 'thale' / 'mandhe' / 'tale' -> head (தலை, BDG_W0001); 'kannu' / 'kanna' -> eye (கண், BDG_W0002); 'mooku' -> nose (மூக்கு, BDG_W0003); 'pal' / 'hallu' -> teeth (பல், BDG_W0008); 'kaalu' -> leg (கால், BDG_W0007); 'amma' / 'avve' -> mother (அம்மா).
   - Marwari (Indo-Aryan language): 'aankh' -> eye; 'naak' -> nose; 'daant' -> teeth; 'matho' -> head; 'haath' -> hand; 'pag' -> leg; 'maa' -> mother.
3. Match the heard sound strictly to one Word ID from the verified wordbank above.
4. If the audio matches a word, return its Word ID and confidence (0.0 to 1.0).
5. If the audio is silence or unrecognizable, return "word_id": null and "confidence": 0.0.

Respond ONLY with valid JSON:
{
  "word_id": "STRING_OR_NULL",
  "confidence": FLOAT,
  "explanation": "Brief explanation of acoustic phonemes heard and why it matches"
}`;

        let geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      inlineData: {
                        mimeType: mimeType.split(";")[0],
                        data: base64Audio,
                      },
                    },
                    {
                      text: prompt,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            }),
          }
        );

        if (!geminiRes.ok) {
          // Fallback to gemini-3.5-flash
          geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        inlineData: {
                          mimeType: mimeType.split(";")[0],
                          data: base64Audio,
                        },
                      },
                      {
                        text: prompt,
                      },
                    ],
                  },
                ],
                generationConfig: {
                  responseMimeType: "application/json",
                  temperature: 0.1,
                },
              }),
            }
          );
        }

        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            const item = Array.isArray(parsed) ? parsed[0] : parsed;
            const matchedWid = item?.word_id;
            const confidence = typeof item?.confidence === "number" ? item.confidence : 0.88;
            const explanation = item?.explanation || "";

            if (matchedWid) {
              const matchedEntry = langVocab.find((e) => e.word_id === matchedWid);
              if (matchedEntry) {
                const clipMatches = (matchedEntry.clips || []).map((cid) => ({
                  clip_id: cid,
                  similarity: confidence,
                }));

                const status = confidence >= 0.5 ? "recognized" : "uncertain";

                return NextResponse.json({
                  status,
                  word_id: matchedEntry.word_id,
                  language: matchedEntry.language,
                  tamil_meaning: matchedEntry.tamil_meaning,
                  english_meaning: matchedEntry.english_meaning,
                  similarity: confidence,
                  margin: 0.15,
                  message: `Identified via Gemini Audio AI: ${explanation}`,
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
        console.warn("Gemini audio recognition error, attempting local backend proxy:", gErr);
      }
    }

    // 2. Try proxy to local Python backend if running
    try {
      const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";
      const proxyForm = new FormData();
      proxyForm.append("file", file, "query.wav");
      proxyForm.append("language", targetLang);

      const pyRes = await fetch(`${pythonBackendUrl}/api/recognize`, {
        method: "POST",
        body: proxyForm,
      });

      if (pyRes.ok) {
        const pyData = await pyRes.json();
        return NextResponse.json(pyData);
      }
    } catch {
      // Python backend not reachable
    }

    // 3. Fallback: unknown
    const defaultCandidate = langVocab[0];
    return NextResponse.json({
      status: "unknown",
      word_id: null,
      language: targetLang,
      tamil_meaning: null,
      english_meaning: null,
      similarity: 0.2,
      margin: 0.0,
      message: `Audio clip was not confidently recognized in the verified ${targetLang} wordbank.`,
      ranked_candidates: defaultCandidate
        ? [
            {
              word_id: defaultCandidate.word_id,
              language: defaultCandidate.language,
              tamil_meaning: defaultCandidate.tamil_meaning,
              english_meaning: defaultCandidate.english_meaning,
              score: 0.2,
              clip_matches: (defaultCandidate.clips || []).map((c) => ({
                clip_id: c,
                similarity: 0.2,
              })),
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
