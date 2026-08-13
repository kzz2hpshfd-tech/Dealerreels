import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendAutoEngagementMessage } from "@/lib/autoMessage";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "You must be signed in to like a reel." }, { status: 401 });
  }

  const videoId = params.id;

  const existing = await db.like.findUnique({
    where: { userId_videoId: { userId, videoId } },
  });

  if (existing) {
    await db.like.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  }

  await db.like.create({ data: { userId, videoId } });
  sendAutoEngagementMessage(videoId, userId).catch((err) => console.error("auto-message error:", err));
  return NextResponse.json({ liked: true });
}
