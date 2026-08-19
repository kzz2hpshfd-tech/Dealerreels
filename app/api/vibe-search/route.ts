import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractR2Key, getPlaybackUrl } from "@/lib/storage";
import { rankByVibe } from "@/lib/vibeSearch";

export const dynamic = "force-dynamic";

// This route never existed until now -- the feed's "Search a vibe" box has
// been calling it since it shipped, silently 404ing and clearing the feed
// every time someone typed something.
export async function POST(req: NextRequest) {
  const { query, dealershipId, dealershipSlug } = await req.json();
  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "query is required." }, { status: 400 });
  }

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
    },
    orderBy: { createdAt: "desc" },
    include: {
      seller: { select: { id: true, name: true, avatarInitials: true } },
      dealership: { select: { id: true, name: true, creditApplyUrl: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  const scores = await rankByVibe(
    query,
    videos.map((v) => ({ id: v.id, caption: v.caption, model: v.model, tags: v.tags }))
  );
  const scoreById = new Map(scores.map((s) => [s.id, s.score]));

  const ranked = videos
    .map((v) => ({ ...v, matchScore: scoreById.get(v.id) ?? null }))
    .sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1));

  const withPlaybackUrls = await Promise.all(
    ranked.map(async (v) => {
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
