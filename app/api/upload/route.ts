import { NextRequest, NextResponse } from "next/server";
import { uploadFileDirect } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60; // seconds — raise if you have long uploads

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!file.type?.startsWith("video/")) {
      return NextResponse.json({ error: "File must be a video/* mime type" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { publicUrl, key } = await uploadFileDirect(buffer, file.type);

    return NextResponse.json({ publicUrl, key });
  } catch (err: any) {
    console.error("upload error:", err);
    return NextResponse.json({ error: err.message || "Unknown server error" }, { status: 500 });
  }
}