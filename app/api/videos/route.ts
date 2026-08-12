import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractR2Key, getPlaybackUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dealershipId = searchParams.get("dealershipId") || undefined;
  const model = searchParams.get("model") || undefined;

  const videos = await db.video.findMany({
    where: {
      status: "READY",
      ...(dealershipId ? { dealershipId } : {}),
      ...(model ? { model } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      seller: { select: { id: true, name: true, avatarInitials: true } },
      dealership: { select: { id: true, name: true, creditApplyUrl: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  // Serve playback via a freshly-signed R2 URL rather than the stored
  // public URL -- sidesteps needing the bucket's public "Development
  // URL" to be enabled and S3_PUBLIC_BASE_URL to correctly match it.
  const withPlaybackUrls = await Promise.all(
    videos.map(async (v) => {
      const key = extractR2Key(v.videoUrl);
      if (!key) return v;
      try {
        return { ...v, videoUrl: await getPlaybackUrl(key) };
      } catch {
        return v;
      }
    })
  );

  return NextResponse.json({ videos: withPlaybackUrls });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id) {
    return NextResponse.json({ error: "You must be signed in to post a reel." }, { status: 401 });
  }
  if (user.role === "SHOPPER" || !user.dealershipId) {
    return NextResponse.json({ error: "Only dealership accounts can post reels." }, { status: 403 });
  }

  try {
    const { caption, model, tags, videoUrl } = await req.json();

    if (!caption || typeof caption !== "string") {
      return NextResponse.json({ error: "Caption is required." }, { status: 400 });
    }
    if (!model || typeof model !== "string") {
      return NextResponse.json({ error: "Model is required." }, { status: 400 });
    }
    if (!videoUrl || typeof videoUrl !== "string") {
      return NextResponse.json({ error: "videoUrl is required." }, { status: 400 });
    }

    const video = await db.video.create({
      data: {
        caption,
        model,
        tags: Array.isArray(tags) ? tags.filter((t) => typeof t === "string") : [],
        videoUrl,
        status: "READY",
        sellerId: user.id,
        dealershipId: user.dealershipId,
      },
    });

    return NextResponse.json({ video });
  } catch (err: any) {
    console.error("create video error:", err);
    return NextResponse.json({ error: err.message || "Unknown server error" }, { status: 500 });
  }
}
