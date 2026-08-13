import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendAutoEngagementMessage } from "@/lib/autoMessage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const comments = await db.comment.findMany({
    where: { videoId: params.id },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, avatarInitials: true } },
    },
  });

  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "You must be signed in to comment." }, { status: 401 });
  }

  const { body } = await req.json();
  if (!body || typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });
  }

  const comment = await db.comment.create({
    data: {
      body: body.trim().slice(0, 1000),
      userId,
      videoId: params.id,
    },
    include: {
      user: { select: { id: true, name: true, avatarInitials: true } },
    },
  });

  sendAutoEngagementMessage(params.id, userId).catch((err) => console.error("auto-message error:", err));
  return NextResponse.json({ comment });
}
