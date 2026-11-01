import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get("text") || "";
    const lang = searchParams.get("lang") || "en";

    if (!text.trim()) {
      return new NextResponse("Text parameter is required", { status: 400 });
    }

    const cleanText = text.trim();
    const targetLang = lang === "ta" ? "ta" : lang === "hi" ? "hi" : "en";
    const encoded = encodeURIComponent(cleanText);

    // Multi-upstream URLs with automatic fallback
    const candidateUrls: string[] = [
      `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encoded}`,
      `https://translate.google.com/translate_tts?ie=UTF-8&client=gtx&tl=${targetLang}&q=${encoded}`,
      `https://translate.googleapis.com/translate_tts?client=gtx&tl=${targetLang}&ie=UTF-8&q=${encoded}`,
    ];

    if (targetLang === "en") {
      candidateUrls.push(`https://dict.youdao.com/dictvoice?audio=${encoded}&type=2`);
    }

    let audioBuffer: ArrayBuffer | null = null;

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: "https://translate.google.com/",
          },
        });

        if (res.ok) {
          const buf = await res.arrayBuffer();
          if (buf && buf.byteLength > 0) {
            audioBuffer = buf;
            break;
          }
        }
      } catch {
        // Try next candidate upstream
      }
    }

    if (!audioBuffer) {
      return new NextResponse("Unable to synthesize speech. Please try again.", { status: 502 });
    }

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

