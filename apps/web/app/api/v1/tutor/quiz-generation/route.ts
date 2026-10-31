import { NextRequest, NextResponse } from "next/server";
import vocabulary from "@/public/data/vocabulary.json";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lang = body.language_code || "badaga";
    const num = Math.min(body.num_questions || 5, 10);

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
    const pool = records.filter(
      (item) => item.language_code === lang && item.audio_assets && item.audio_assets.length > 0
    );

    const selectedPool = pool.length >= num ? pool : records;
    const shuffled = [...selectedPool].sort(() => 0.5 - Math.random());
    const chosen = shuffled.slice(0, num);

    const questions = chosen.map((item, idx) => {
      const distractors = records
        .filter((d) => d.id !== item.id && d.english_meaning !== item.english_meaning)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((d) => d.english_meaning);

      const options = [item.english_meaning, ...distractors].sort(() => 0.5 - Math.random());

      return {
        id: `q_${idx + 1}`,
        question_text: `What is the English meaning of "${item.tamil_meaning}" (${item.source_word ? `"${item.source_word}"` : item.external_word_id})?`,
        options,
        correct_answer: item.english_meaning,
        tamil_word: item.tamil_meaning,
        audio_url: item.audio_assets?.[0]?.audio_url || null,
        category: item.category,
      };
    });

    return NextResponse.json({ questions });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
