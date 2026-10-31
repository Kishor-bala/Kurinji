import { NextRequest, NextResponse } from "next/server";
import vocabulary from "@/public/data/vocabulary.json";

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

    // 2. Ground-truth vocabulary lookup
    const q = (message || "").toLowerCase().trim();
    const matched = (vocabulary as Array<Record<string, unknown>>).filter(
      (item) =>
        (item.language_code === language_code || language_code === "all") &&
        (q.includes(String(item.english_meaning || "").toLowerCase()) ||
          q.includes(String(item.tamil_meaning || "").toLowerCase()) ||
          (item.source_word && q.includes(String(item.source_word).toLowerCase())))
    );

    // 3. If GROQ_API_KEY is available, call Groq LLaMA
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      const vocabContext = matched
        .slice(0, 5)
        .map(
          (v) =>
            `- ${v.english_meaning} (${v.tamil_meaning}) = Oral: ${v.source_word || "N/A"} [${v.external_word_id}]`
        )
        .join("\n");

      const prompt = `You are an AI heritage language tutor for Badaga and Marwari.
User query: "${message}".
Relevant ground-truth vocabulary from dataset:
${vocabContext || "No exact keyword match in verified database."}

Provide a concise, warm, educational response in English with Tamil meaning and oral pronunciation.`;

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are an expert Badaga & Marwari heritage language tutor. Keep responses focused and pedagogical.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 300,
        }),
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const reply = groqData.choices?.[0]?.message?.content;
        const first = matched[0];
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
    if (matched.length > 0) {
      const first = matched[0];
      const audioAssets = (first.audio_assets as Array<{ audio_url: string }>) || [];
      return NextResponse.json({
        message: `In ${first.language_name}, "${first.english_meaning}" is "${first.tamil_meaning}" in Tamil, spoken orally as "${first.source_word || "spoken"}". Category: ${first.category}.`,
        provider_used: "vocabulary_engine",
        verified_vocabulary: matched.slice(0, 3),
        audio_url: audioAssets[0]?.audio_url || null,
        audio_assets: audioAssets,
      });
    }

    return NextResponse.json({
      message: `I searched the verified heritage dataset for "${message}". Try asking about body parts, family relations, kitchen items, or numbers!`,
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
