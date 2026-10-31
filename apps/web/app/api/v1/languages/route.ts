import { NextResponse } from "next/server";
import languages from "@/public/data/languages.json";

export async function GET() {
  return NextResponse.json(languages);
}
