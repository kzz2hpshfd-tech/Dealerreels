import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const video = await db.video.findUnique({ where: { id: params.id } });
  if (!video) {
    return NextResponse.json({ error: "Reel not found." }, { status: 404 });
  }
  if (video.sellerId !== userId) {
    return NextResponse.json({ error: "You can only delete your own reels." }, { status: 403 });
  }

  // No onDelete: Cascade on Like/Comment's Video relation, so their rows
  // have to go first or the delete hits a foreign key violation.
  await db.$transaction([
    db.like.deleteMany({ where: { videoId: params.id } }),
    db.comment.deleteMany({ where: { videoId: params.id } }),
    db.video.delete({ where: { id: params.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
