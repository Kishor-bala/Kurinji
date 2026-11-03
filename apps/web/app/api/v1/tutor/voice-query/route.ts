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

    // 2. Groq Whisper Cloud STT with Domain & Language Biasing
    const groqKey = process.env.GROQ_API_KEY;
    let transcribedText = "";

    if (groqKey && file) {
      try {
        const groqForm = new FormData();
        groqForm.append("file", file, "audio.wav");
        groqForm.append("model", "whisper-large-v3-turbo");
        groqForm.append("response_format", "json");
        // Bias Whisper towards Tamil, English, Thanglish, Badaglish & Marwarish vocabulary
        groqForm.append(
          "prompt",
          "Badaga, Marwari, Tamil, Thanglish, Badaglish, Neeru, Thale, Kannu, Moogu, Baayi, Kaalu, Agalu, Thanni, Thala, Water, Eye, Nose, Mouth, Hand, Leg, Milk, Tree, Haalu, Mara, Mane, Avve, Appa, Hallu, Paani, Matho, Aankh, Naak"
        );

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

    // 3. Phonetic and acoustic tone similarity matching across filtered vocabulary
    const matchResults = findBestVocabularyMatches(transcribedText, languageCode, records, 5);
    const matched = matchResults.map((r) => r.record);
    const first = matched[0];
    const targetLangName = languageCode === "all" ? "Badaga & Marwari" : (languageCode === "marwari" ? "Marwari" : "Badaga");

    let tutorMessage = "";

    // 4. Generate structured grounded response using Groq LLM
    if (groqKey && transcribedText && first) {
      try {
        const vocabContext = matchResults
          .map(
            (m) =>
              `- ${m.record.language_name} Term: "${m.record.source_word || m.record.latin_word || m.record.english_meaning}" | English: "${m.record.english_meaning}" | Tamil: "${m.record.tamil_meaning}" | Phonetics: "${m.record.tamil_phonetics || ''}"`
          )
          .join("\n");

        const prompt = `You are Kurinji AI, a focused heritage language tutor for ${targetLangName}.
User voice input: "${transcribedText}".
Verified matches from database:
${vocabContext}

CRITICAL RULES:
1. Always start directly with the matched pair in format:
**${first.source_word || first.latin_word || first.english_meaning} (${first.english_meaning})**
2. Explain the word in ${first.language_name} and give Tamil script: (Tamil: **${first.tamil_meaning}**).
3. If user said a variation like "thanni", "water", "niru", "neru", "taale", note that it corresponds to this heritage word.
4. Keep the entire response under 2 concise, supportive sentences. Do not hallucinate.`;

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
                  `You are an expert ${targetLangName} heritage language tutor. Keep replies grounded in verified vocabulary with format: word (meaning).`,
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
            max_tokens: 250,
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
                    `You are an expert ${targetLangName} heritage language tutor. Keep replies grounded in verified vocabulary with format: word (meaning).`,
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.2,
              max_tokens: 250,
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
        const latin = first.source_word || first.latin_word || first.english_meaning;
        tutorMessage = `**${latin} (${first.english_meaning})**\nIn ${first.language_name}, "${first.english_meaning}" is expressed as **${latin}** (Tamil: **${first.tamil_meaning}**). Your query "${transcribedText}" matches this heritage term.`;
      } else {
        tutorMessage = `Kurinji AI is focused on ${targetLangName} heritage vocabulary. Please ask about words like "neeru" (water), "thanni", "kannu" (eye), or "thale" (head)!`;
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
