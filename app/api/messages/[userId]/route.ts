import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  const myId = (session?.user as any)?.id;
  if (!myId) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const otherId = params.userId;

  const [messages, otherUser] = await Promise.all([
    db.message.findMany({
      where: {
        OR: [
          { senderId: myId, recipientId: otherId },
          { senderId: otherId, recipientId: myId },
        ],
      },
      orderBy: { createdAt: "asc" },
    }),
    db.user.findUnique({
      where: { id: otherId },
      select: { id: true, name: true, avatarInitials: true },
    }),
  ]);

  if (!otherUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  await db.message.updateMany({
    where: { senderId: otherId, recipientId: myId, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ messages, otherUser });
}

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  const myId = (session?.user as any)?.id;
  if (!myId) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const otherId = params.userId;
  if (otherId === myId) {
    return NextResponse.json({ error: "You can't message yourself." }, { status: 400 });
  }

  const { body } = await req.json();
  if (!body || typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }

  const other = await db.user.findUnique({ where: { id: otherId } });
  if (!other) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const message = await db.message.create({
    data: {
      body: body.trim().slice(0, 2000),
      senderId: myId,
      recipientId: otherId,
    },
  });

  return NextResponse.json({ message });
}
