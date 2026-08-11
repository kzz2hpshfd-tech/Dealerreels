import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const followerId = (session?.user as any)?.id;
  if (!followerId) {
    return NextResponse.json({ error: "You must be signed in to follow a seller." }, { status: 401 });
  }

  const followingId = params.id;
  if (followerId === followingId) {
    return NextResponse.json({ error: "You can't follow yourself." }, { status: 400 });
  }

  const existing = await db.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });

  if (existing) {
    await db.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  }

  await db.follow.create({ data: { followerId, followingId } });
  return NextResponse.json({ following: true });
}
