import { NextRequest, NextResponse } from "next/server";
import kurinjiVocabData from "@/public/data/kurinji_vocabulary.json";

interface KurinjiEntry {
  word_id: string;
  language: string;
  tamil_meaning: string;
  english_meaning: string;
  optional_romanised_pronunciation?: string;
  notes?: string;
  clips?: string[];
}

function getKurinjiData(): KurinjiEntry[] {
  return kurinjiVocabData as KurinjiEntry[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language")?.trim();
  const search = searchParams.get("search")?.toLowerCase().trim();
  const limit = parseInt(searchParams.get("limit") || "300", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let entries = getKurinjiData();

  if (language && (language === "Badaga" || language === "Marwari")) {
    entries = entries.filter((e) => e.language.toLowerCase() === language.toLowerCase());
  }

  if (search) {
    entries = entries.filter(
      (e) =>
        e.word_id.toLowerCase().includes(search) ||
        e.english_meaning.toLowerCase().includes(search) ||
        e.tamil_meaning.includes(search) ||
        (e.optional_romanised_pronunciation &&
          e.optional_romanised_pronunciation.toLowerCase().includes(search))
    );
  }

  const total = entries.length;
  const sliced = entries.slice(offset, offset + limit);

  return NextResponse.json({
    total,
    entries: sliced,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word_id, language, tamil_meaning, english_meaning, notes } = body;

    if (!word_id || !tamil_meaning || !english_meaning) {
      return NextResponse.json(
        { status: "error", message: "word_id, tamil_meaning, and english_meaning are required." },
        { status: 400 }
      );
    }

    const newEntry: KurinjiEntry = {
      word_id: word_id.trim().toUpperCase(),
      language: language || "Badaga",
      tamil_meaning: tamil_meaning.trim(),
      english_meaning: english_meaning.trim(),
      notes: notes ? notes.trim() : undefined,
      clips: [],
    };

    // Keep in-memory cache updated during the user session
    try {
      const vocabList = kurinjiVocabData as KurinjiEntry[];
      const existingIdx = vocabList.findIndex((e) => e.word_id === newEntry.word_id);
      if (existingIdx >= 0) {
        vocabList[existingIdx] = newEntry;
      } else {
        vocabList.push(newEntry);
      }
    } catch {
      // In-memory update
    }

    return NextResponse.json({
      status: "success",
      vocabulary: newEntry,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: "error", message: msg }, { status: 500 });
  }
}
