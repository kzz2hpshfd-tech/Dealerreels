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

  const comment = await db.comment.findUnique({ where: { id: params.id } });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }
  if (comment.userId !== userId) {
    return NextResponse.json({ error: "You can only delete your own comments." }, { status: 403 });
  }

  await db.comment.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
