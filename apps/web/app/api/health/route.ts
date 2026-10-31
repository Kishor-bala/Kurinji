import { NextResponse } from "next/server";
import kurinjiVocabData from "@/public/data/kurinji_vocabulary.json";

export async function GET() {
  const vocabCount = kurinjiVocabData.length || 3318;
  const recordingsCount = 619;
  const embeddingsCount = 619;

  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiEnabled = Boolean(geminiKey && geminiKey.length > 10 && !geminiKey.startsWith("YOUR_"));

  return NextResponse.json({
    status: "healthy",
    encoder: "Gemini 2.5 Audio AI + Verified Vocabulary Grounding",
    sample_rate: 16000,
    gemini_enabled: geminiEnabled,
    counts: {
      vocabulary: vocabCount,
      recordings: recordingsCount,
      embeddings: embeddingsCount,
    },
  });
}
