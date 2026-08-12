import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "You must be signed in to save a reel." }, { status: 401 });
  }

  const videoId = params.id;

  const existing = await db.savedVideo.findUnique({
    where: { userId_videoId: { userId, videoId } },
  });

  if (existing) {
    await db.savedVideo.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  await db.savedVideo.create({ data: { userId, videoId } });
  return NextResponse.json({ saved: true });
}
