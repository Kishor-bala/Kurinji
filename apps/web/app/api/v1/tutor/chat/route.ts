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

    const targetLangName = (language_code === "marwari") ? "Marwari" : ((language_code === "all") ? "Badaga & Marwari" : "Badaga");

    // 3. If GROQ_API_KEY is available, call Groq LLM
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && first) {
      const vocabContext = matchResults
        .map(
          (m) =>
            `- ${m.record.language_name} Term: "${m.record.source_word || m.record.latin_word || m.record.english_meaning}" | English: "${m.record.english_meaning}" | Tamil: "${m.record.tamil_meaning}" | Phonetics: "${m.record.tamil_phonetics || ''}"`
        )
        .join("\n");

      const prompt = `You are Kurinji AI, a focused heritage language tutor for ${targetLangName}.
User query: "${message}".
Verified matches from database:
${vocabContext}

CRITICAL RULES:
1. Always start directly with the matched pair in format:
**${first.source_word || first.latin_word || first.english_meaning} (${first.english_meaning})**
2. Explain the word in ${first.language_name} and give Tamil script: (Tamil: **${first.tamil_meaning}**).
3. If user said a variation like "thanni", "water", "niru", "neru", "taale", note that it corresponds to this heritage word.
4. Keep the entire response under 2 concise, supportive sentences. Do not hallucinate.`;

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
                `You are an expert ${targetLangName} heritage language tutor. Keep replies grounded in verified vocabulary with format: word (meaning).`,
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 250,
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
                  `You are an expert ${targetLangName} heritage language tutor. Keep replies grounded in verified vocabulary with format: word (meaning).`,
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
            max_tokens: 250,
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
      const latin = first.source_word || first.latin_word || first.english_meaning;
      return NextResponse.json({
        message: `**${latin} (${first.english_meaning})**\nIn ${first.language_name}, "${first.english_meaning}" is expressed as **${latin}** (Tamil: **${first.tamil_meaning}**). Your query "${message}" matches this heritage term.`,
        provider_used: "vocabulary_engine",
        verified_vocabulary: matched.slice(0, 3),
        audio_url: audioAssets[0]?.audio_url || null,
        audio_assets: audioAssets,
      });
    }

    return NextResponse.json({
      message: `Kurinji AI is specialized in ${targetLangName} heritage vocabulary. Please ask about words like "neeru" (water), "thanni", "kannu" (eye), or "thale" (head)!`,
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
