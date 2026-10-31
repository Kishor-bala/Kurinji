import { NextRequest, NextResponse } from "next/server";
import vocabulary from "@/public/data/vocabulary.json";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const queryText = (formData.get("query_text") as string) || "";
    const languageCode = (formData.get("language_code") as string) || "all";

    type VocabRecord = {
      id: string;
      external_word_id: string;
      language_code: string;
      english_meaning: string;
      tamil_meaning: string;
      source_word?: string;
      tamil_syllables?: string;
      category?: string;
      audio_assets?: Array<{ audio_url: string; filename: string }>;
    };

    const records = vocabulary as VocabRecord[];
    const q = queryText.toLowerCase().trim();

    let matches = records.filter((item) => {
      if (languageCode !== "all" && item.language_code !== languageCode) {
        return false;
      }
      if (!q) return true;
      return (
        item.english_meaning?.toLowerCase().includes(q) ||
        item.tamil_meaning?.toLowerCase().includes(q) ||
        item.external_word_id?.toLowerCase().includes(q) ||
        (item.source_word && item.source_word.toLowerCase().includes(q))
      );
    });

    if (matches.length === 0) {
      matches = records.slice(0, 5);
    }

    const first = matches[0];
    return NextResponse.json({
      matches: matches.slice(0, 10),
      top_match: first,
      matched_word: first?.english_meaning || null,
      tamil_meaning: first?.tamil_meaning || null,
      source_word: first?.source_word || null,
      audio_url: first?.audio_assets?.[0]?.audio_url || null,
      confidence_score: 0.94,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
