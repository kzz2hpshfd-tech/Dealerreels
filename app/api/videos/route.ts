import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractR2Key, getPlaybackUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dealershipId = searchParams.get("dealershipId") || undefined;
  // Lets an embedded badge on a dealership's own website link straight to
  // that dealership's feed without needing to know its internal ID -- the
  // slug is the one identifier that's safe to hardcode into a public,
  // third-party embed.
  const dealershipSlug = searchParams.get("dealershipSlug") || undefined;
  const model = searchParams.get("model") || undefined;

  let resolvedDealershipId = dealershipId;
  if (!resolvedDealershipId && dealershipSlug) {
    const match = await db.dealership.findUnique({ where: { slug: dealershipSlug }, select: { id: true } });
    // An unrecognized slug must return zero results, not silently fall
    // through to showing every dealership's reels.
    if (!match) return NextResponse.json({ videos: [] });
    resolvedDealershipId = match.id;
  }

  const videos = await db.video.findMany({
    where: {
      status: "READY",
      ...(resolvedDealershipId ? { dealershipId: resolvedDealershipId } : {}),
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

  // Checked fresh against the DB rather than the JWT session, since the
  // session won't reflect an admin's approval until the user logs in
  // again.
  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { verificationStatus: true } });
  if (dbUser?.verificationStatus === "PENDING") {
    return NextResponse.json(
      { error: "Your dealership account is pending verification. You'll be able to post once it's approved." },
      { status: 403 }
    );
  }
  if (dbUser?.verificationStatus === "REJECTED") {
    return NextResponse.json({ error: "Your dealership account was not approved to post reels." }, { status: 403 });
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
