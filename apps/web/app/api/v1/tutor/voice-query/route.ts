import { NextRequest, NextResponse } from "next/server";
import vocabulary from "@/public/data/vocabulary.json";

import { findBestVocabularyMatches, VocabRecord } from "@/lib/tutor-matcher";

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

    // 3. Phonetic and dialect similarity matching across full vocabulary
    const matchResults = findBestVocabularyMatches(transcribedText, languageCode, records, 5);
    const matched = matchResults.map((r) => r.record);
    const first = matched[0];

    let tutorMessage = "";

    // 4. Generate intelligent AI tutor response using Groq LLM
    if (groqKey && transcribedText) {
      try {
        const vocabContext = matchResults
          .map(
            (m) =>
              `- Concept: "${m.record.english_meaning}", Tamil: "${m.record.tamil_meaning}", Phonetics: "${m.record.tamil_phonetics || m.record.tamil_syllables || ''}", Oral Variant: "${m.record.source_word || m.matchedPhonetic}" (Match: ${Math.round(m.score * 100)}%)`
          )
          .join("\n");

        const prompt = `You are Kurinji AI, a premier heritage language tutor for Badaga and Marwari.
User spoke via microphone: "${transcribedText}".
Verified phonetic and lexical matches from the dataset:
${vocabContext || "No exact keyword match in verified database."}

INSTRUCTION:
Even if the speaker's pronunciation is an oral dialect variation (such as "taale", "thale", "talæ", "tale" for "head" / "தலை"), directly recognize it as the corresponding Badaga heritage word!
1. Directly state the Badaga word and English meaning: e.g. "**Head** in Badaga is **Thale / Taale** (Tamil: **தலை**)".
2. Note that their pronunciation ("${transcribedText}") corresponds to this term.
3. Provide simple phonetics: e.g. "tha-lay".
Keep it friendly, accurate, and concise (2-3 sentences max).`;

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
                content:
                  "You are an expert Badaga & Marwari heritage language tutor. Always recognize oral dialect variations like thale/taale for head.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
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
                  content:
                    "You are an expert Badaga & Marwari heritage language tutor. Always recognize oral dialect variations like thale/taale for head.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.2,
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
      if (first) {
        const phon = first.tamil_phonetics?.replace(/\+/g, "").trim() || first.source_word || "thale";
        tutorMessage = `**${first.english_meaning}** in ${first.language_name} is spoken as **${phon}** (Tamil: **${first.tamil_meaning}**). Your spoken input "${transcribedText}" closely matches this Badaga heritage word!`;
      } else {
        tutorMessage = `I heard: "${transcribedText || "your voice input"}". Let's explore more heritage words in Badaga!`;
      }
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
