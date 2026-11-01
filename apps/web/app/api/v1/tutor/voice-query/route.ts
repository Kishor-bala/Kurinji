import { NextRequest, NextResponse } from "next/server";
import vocabulary from "@/public/data/vocabulary.json";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;
    const languageCode = (formData.get("language_code") as string) || "badaga";

    // 1. If Python backend is configured, forward
    const pythonBackend = process.env.PYTHON_BACKEND_URL;
    if (pythonBackend) {
      try {
        const forwardForm = new FormData();
        if (file) forwardForm.append("file", file, "audio.wav");
        forwardForm.append("language_code", languageCode);

        const res = await fetch(`${pythonBackend}/api/v1/tutor/voice-query`, {
          method: "POST",
          body: forwardForm,
        });
        if (res.ok) {
          return NextResponse.json(await res.json());
        }
      } catch {
        // Fallback below
      }
    }

    type VocabRecord = {
      id: string;
      external_word_id: string;
      language_code: string;
      language_name: string;
      english_meaning: string;
      tamil_meaning: string;
      source_word?: string;
      category?: string;
      audio_assets?: Array<{ audio_url: string }>;
    };
    const records = vocabulary as VocabRecord[];

    // 2. Groq Whisper Cloud STT
    const groqKey = process.env.GROQ_API_KEY;
    let transcribedText = "";

    if (groqKey && file) {
      try {
        const groqForm = new FormData();
        groqForm.append("file", file, "audio.wav");
        groqForm.append("model", "whisper-large-v3-turbo");
        groqForm.append("response_format", "json");

        const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKey}` },
          body: groqForm,
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          transcribedText = groqData.text || "";
        }
      } catch (err) {
        console.warn("Groq Whisper error:", err);
      }
    }

    const q = (transcribedText || "").toLowerCase().trim();
    const matched = records.filter(
      (item) =>
        (item.language_code === languageCode || languageCode === "all") &&
        (q.includes(item.english_meaning.toLowerCase()) ||
          q.includes(item.tamil_meaning.toLowerCase()) ||
          (item.source_word && q.includes(item.source_word.toLowerCase())) ||
          item.external_word_id.toLowerCase().includes(q))
    );

    const first = matched[0];
    let tutorMessage = "";

    // Generate intelligent AI tutor response using Groq
    if (groqKey && transcribedText) {
      try {
        const vocabContext = matched
          .slice(0, 5)
          .map(
            (v) =>
              `- ${v.english_meaning} (${v.tamil_meaning}) = Oral: ${v.source_word || "spoken"} [${v.external_word_id}]`
          )
          .join("\n");

        const prompt = `You are Kurinji AI, a warm and pedagogical heritage language tutor for Badaga and Marwari.
User spoke via microphone: "${transcribedText}".
Relevant verified canonical records:
${vocabContext || "No exact keyword match in verified database."}

Provide a concise, encouraging 2-3 sentence answer explaining the word/concept, its Tamil meaning, and how to pronounce it in ${languageCode === "marwari" ? "Marwari" : "Badaga"}.`;

        let chatRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
                content: "You are an expert Badaga & Marwari heritage language tutor. Keep replies warm, clear, and educational.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 280,
          }),
        });

        if (!chatRes.ok) {
          chatRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
                  content: "You are an expert Badaga & Marwari heritage language tutor. Keep replies warm, clear, and educational.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.3,
              max_tokens: 280,
            }),
          });
        }

        if (chatRes.ok) {
          const chatData = await chatRes.json();
          tutorMessage = chatData.choices?.[0]?.message?.content || "";
        }
      } catch (err) {
        console.warn("Groq tutor chat error in voice query:", err);
      }
    }

    if (!tutorMessage) {
      tutorMessage = first
        ? `In ${first.language_name}, "${first.english_meaning}" is "${first.tamil_meaning}" in Tamil, pronounced as "${first.source_word || first.english_meaning}".`
        : `I heard: "${transcribedText || "your voice input"}". Let's explore more heritage words in Badaga and Marwari together!`;
    }

    const responseTtsUrl = `/api/v1/vocabulary/tts/synthesize?text=${encodeURIComponent(
      tutorMessage
    )}&lang=en`;

    return NextResponse.json({
      transcription: transcribedText || "Voice Input Recorded",
      message: tutorMessage,
      provider_used: "groq_whisper_grounded",
      verified_vocabulary: matched.slice(0, 3),
      audio_url: first?.audio_assets?.[0]?.audio_url || null,
      audio_assets: first?.audio_assets || [],
      response_tts_url: responseTtsUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
