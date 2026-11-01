import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get("text") || "";
    const lang = searchParams.get("lang") || "en";

    if (!text.trim()) {
      return new NextResponse("Text parameter is required", { status: 400 });
    }

    const targetLang = lang === "ta" ? "ta" : lang === "hi" ? "hi" : "en";
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encodeURIComponent(
      text.trim()
    )}`;

    const res = await fetch(googleTtsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://translate.google.com/",
      },
    });

    if (!res.ok) {
      return new NextResponse("Failed to synthesize speech", { status: res.status });
    }

    const audioBuffer = await res.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("TTS synthesize error:", error);
    return new NextResponse("Unable to synthesize speech. Please try again.", { status: 500 });
  }
}
