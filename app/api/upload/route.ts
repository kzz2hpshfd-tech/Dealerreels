import { NextRequest, NextResponse } from "next/server";
import { createUploadUrl } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const { contentType } = await req.json();
    if (!contentType?.startsWith("video/")) {
      return NextResponse.json({ error: "contentType must be a video/* mime type" }, { status: 400 });
    }
    const { uploadUrl, publicUrl } = await createUploadUrl(contentType);
    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (err: any) {
    console.error("upload error:", err);
    return NextResponse.json({ error: err.message || "Unknown server error" }, { status: 500 });
  }
}