import { NextRequest, NextResponse } from "next/server";
import vocabulary from "@/public/data/vocabulary.json";

import { findBestVocabularyMatches, VocabRecord } from "@/lib/tutor-matcher";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, language_code } = body;

    // 1. If external Python backend configured, proxy request
    const pythonBackend = process.env.PYTHON_BACKEND_URL;
    if (pythonBackend) {
      try {
        const res = await fetch(`${pythonBackend}/api/v1/tutor/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          return NextResponse.json(await res.json());
        }
      } catch {
        // Fallback to serverless tutor below
      }
    }

    const records = vocabulary as VocabRecord[];

    // 2. Phonetic & semantic vocabulary lookup
    const matchResults = findBestVocabularyMatches(message, language_code || "badaga", records, 5);
    const matched = matchResults.map((m) => m.record);
    const first = matched[0];

    // 3. If GROQ_API_KEY is available, call Groq LLM
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      const vocabContext = matchResults
        .map(
          (m) =>
            `- Concept: "${m.record.english_meaning}", Tamil: "${m.record.tamil_meaning}", Phonetics: "${m.record.tamil_phonetics || m.record.tamil_syllables || ''}", Oral Variant: "${m.record.source_word || m.matchedPhonetic}" (Match: ${Math.round(m.score * 100)}%)`
        )
        .join("\n");

      const prompt = `You are Kurinji AI, a premier heritage language tutor for Badaga and Marwari.
User query: "${message}".
Verified phonetic and lexical matches from the dataset:
${vocabContext || "No exact keyword match in verified database."}

INSTRUCTION:
Even if the user writes or speaks an oral dialect variation (such as "taale", "thale", "talæ", "tale" for "head" / "தலை"), directly recognize it as the corresponding Badaga heritage word!
1. Directly state the Badaga word and English meaning: e.g. "**Head** in Badaga is **Thale / Taale** (Tamil: **தலை**)".
2. Note how their query corresponds to this term.
3. Provide simple phonetics: e.g. "tha-lay".
Keep it friendly, accurate, and concise (2-3 sentences max).`;

      let groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content:
                "You are an expert Badaga & Marwari heritage language tutor. Always recognize oral dialect variations like thale/taale for head.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 300,
        }),
      });

      if (!groqRes.ok) {
        groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert Badaga & Marwari heritage language tutor. Always recognize oral dialect variations like thale/taale for head.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
            max_tokens: 300,
          }),
        });
      }

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const reply = groqData.choices?.[0]?.message?.content;
        const audioAssets = (first?.audio_assets as Array<{ audio_url: string }>) || [];
        return NextResponse.json({
          message: reply,
          provider_used: "groq",
          verified_vocabulary: matched.slice(0, 3),
          audio_url: audioAssets[0]?.audio_url || null,
          audio_assets: audioAssets,
        });
      }
    }

    // 4. Default grounded response
    if (matched.length > 0 && first) {
      const audioAssets = (first.audio_assets as Array<{ audio_url: string }>) || [];
      const phon = first.tamil_phonetics?.replace(/\+/g, "").trim() || first.source_word || "thale";
      return NextResponse.json({
        message: `In ${first.language_name}, "**${first.english_meaning}**" is expressed as **${phon}** (Tamil: **${first.tamil_meaning}**). Your query "${message}" matches this heritage term.`,
        provider_used: "vocabulary_engine",
        verified_vocabulary: matched.slice(0, 3),
        audio_url: audioAssets[0]?.audio_url || null,
        audio_assets: audioAssets,
      });
    }

    return NextResponse.json({
      message: `I searched the verified heritage dataset for "${message}". Try asking about body parts (e.g. thale, kannu, moogu), family relations, or numbers!`,
      provider_used: "vocabulary_engine",
      verified_vocabulary: [],
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Sorry, I encountered an issue retrieving that definition.", error: String(error) },
      { status: 500 }
    );
  }
}
