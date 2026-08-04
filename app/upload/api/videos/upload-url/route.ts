import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dealershipId = searchParams.get("dealershipId") || undefined;
  const model = searchParams.get("model") || undefined;
  const cursor = searchParams.get("cursor") || undefined;
  const take = 10;
  const videos = await db.video.findMany({
    where: { status: "READY", ...(dealershipId ? { dealershipId } : {}), ...(model ? { model } : {}) },
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      seller: { select: { id: true, name: true, avatarInitials: true } },
      dealership: { select: { id: true, name: true, creditApplyUrl: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });
  const nextCursor = videos.length === take ? videos[videos.length - 1].id : null;
  return NextResponse.json({ videos, nextCursor });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { caption, model, tags, videoUrl, thumbnailUrl } = body;
  if (!caption || !model || !videoUrl) {
    return NextResponse.json({ error: "caption, model, and videoUrl are required" }, { status: 400 });
  }
  const poster = await db.user.findFirst();
  if (!poster) {
    return NextResponse.json({ error: "No account exists yet — run the Neon SQL setup first" }, { status: 400 });
  }
  const video = await db.video.create({
    data: { caption, model, tags: Array.isArray(tags) ? tags : [], videoUrl, thumbnailUrl, status: "READY", sellerId: poster.id, dealershipId: poster.dealershipId },
  });
  return NextResponse.json({ video }, { status: 201 });
}

