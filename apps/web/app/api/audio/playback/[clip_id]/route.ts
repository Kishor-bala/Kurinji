import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clip_id: string }> }
) {
  const { clip_id } = await params;
  if (!clip_id) {
    return new NextResponse("Clip ID required", { status: 400 });
  }

  // Sanitize filename to prevent directory traversal
  const safeClipId = clip_id.replace(/[^a-zA-Z0-9_-]/g, "");

  // Redirect directly to the static audio file in public/audio served by Vercel CDN
  return NextResponse.redirect(new URL(`/audio/${safeClipId}.wav`, request.url), 307);
}
