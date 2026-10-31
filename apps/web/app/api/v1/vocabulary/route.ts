import { NextRequest, NextResponse } from "next/server";
import vocabulary from "@/public/data/vocabulary.json";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language")?.toLowerCase().trim();
  const search = searchParams.get("search")?.toLowerCase().trim();
  const limit = parseInt(searchParams.get("limit") || "1000", 10);

  let items = [...vocabulary];

  if (language && language !== "all") {
    items = items.filter((item) => item.language_code === language);
  }

  if (search) {
    items = items.filter(
      (item) =>
        item.english_meaning?.toLowerCase().includes(search) ||
        item.tamil_meaning?.toLowerCase().includes(search) ||
        item.external_word_id?.toLowerCase().includes(search) ||
        (item.source_word && item.source_word.toLowerCase().includes(search)) ||
        (item.category && item.category.toLowerCase().includes(search)) ||
        (item.tamil_syllables && item.tamil_syllables.toLowerCase().includes(search))
    );
  }

  return NextResponse.json(items.slice(0, limit));
}
