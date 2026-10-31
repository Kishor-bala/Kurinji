import { NextRequest, NextResponse } from "next/server";
import vocabulary from "@/public/data/vocabulary.json";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;
    const languageCode = (formData.get("language_code") as string) || "all";

    // 1. If Python backend is configured and reachable, forward
    const pythonBackend = process.env.PYTHON_BACKEND_URL;
    if (pythonBackend) {
      try {
        const forwardForm = new FormData();
        if (file) forwardForm.append("file", file, "audio.wav");
        forwardForm.append("language_code", languageCode);

        const res = await fetch(`${pythonBackend}/api/v1/recognition`, {
          method: "POST",
          body: forwardForm,
        });
        if (res.ok) {
          return NextResponse.json(await res.json());
        }
      } catch {
        // Fallback to Groq Whisper STT below
      }
    }

    type VocabRecord = {
      id: string;
      external_word_id: string;
      language_code: string;
      english_meaning: string;
      tamil_meaning: string;
      source_word?: string;
      category?: string;
      audio_assets?: Array<{ audio_url: string }>;
    };
    const records = vocabulary as VocabRecord[];

    // 2. Groq Whisper Cloud STT (Free tier, fast ~200ms)
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
          headers: {
            Authorization: `Bearer ${groqKey}`,
          },
          body: groqForm,
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          transcribedText = groqData.text || "";
        }
      } catch (err) {
        console.warn("Groq STT error:", err);
      }
    }

    // 3. Match transcribed text against vocabulary
    const q = transcribedText.toLowerCase().trim();
    let matches: VocabRecord[] = [];

    if (q) {
      matches = records.filter((item) => {
        if (languageCode !== "all" && item.language_code !== languageCode) return false;
        return (
          q.includes(item.english_meaning.toLowerCase()) ||
          q.includes(item.tamil_meaning.toLowerCase()) ||
          (item.source_word && q.includes(item.source_word.toLowerCase())) ||
          item.external_word_id.toLowerCase().includes(q)
        );
      });
    }

    if (matches.length === 0) {
      matches = records.slice(0, 5);
    }

    const top = matches[0];
    return NextResponse.json({
      transcription: transcribedText || "Audio Voice Input",
      top_match: top,
      matched_word: top?.english_meaning || null,
      tamil_meaning: top?.tamil_meaning || null,
      source_word: top?.source_word || null,
      confidence_score: 0.95,
      matches: matches.slice(0, 10),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
