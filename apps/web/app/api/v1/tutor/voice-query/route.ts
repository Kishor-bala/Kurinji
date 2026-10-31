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
    const shortText = first
      ? `In ${first.language_name}, ${first.english_meaning} is ${first.tamil_meaning}.`
      : `I heard: "${transcribedText || "your voice input"}". Let's learn more heritage vocabulary together!`;

    const responseTtsUrl = `/api/v1/vocabulary/tts/synthesize?text=${encodeURIComponent(
      shortText
    )}&lang=en`;

    return NextResponse.json({
      transcription: transcribedText || "Voice Input Recorded",
      message: shortText,
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
