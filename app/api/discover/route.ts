import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractR2Key, getPlaybackUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Instagram-Explore-style discovery grid: every ready video across every
// dealership, lightly ranked toward whatever models/tags this shopper has
// already liked or saved. Falls back to newest-first when there's no
// signal yet (a new account, or nobody signed in).
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  const videos = await db.video.findMany({
    where: { status: "READY" },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      caption: true,
      model: true,
      tags: true,
      thumbnailUrl: true,
      videoUrl: true,
      dealership: { select: { name: true } },
      _count: { select: { likes: true } },
    },
  });

  const preferredModels = new Set<string>();
  const preferredTags = new Set<string>();
  if (userId) {
    const signal = await db.video.findMany({
      where: { OR: [{ likes: { some: { userId } } }, { saves: { some: { userId } } }] },
      select: { model: true, tags: true },
      take: 50,
    });
    signal.forEach((v) => {
      preferredModels.add(v.model);
      v.tags.forEach((t) => preferredTags.add(t));
    });
  }

  // Stable sort keeps the createdAt-desc order for anything tied at the
  // same score, so with no signal at all this is just newest-first.
  const ranked = videos
    .map((v) => {
      let score = 0;
      if (preferredModels.has(v.model)) score += 2;
      score += v.tags.filter((t) => preferredTags.has(t)).length;
      return { ...v, _score: score };
    })
    .sort((a, b) => b._score - a._score);

  const withPlaybackUrls = await Promise.all(
    ranked.map(async (v) => {
      const { _score, ...rest } = v;
      const key = extractR2Key(v.videoUrl);
      if (!key) return rest;
      try {
        return { ...rest, videoUrl: await getPlaybackUrl(key) };
      } catch {
        return rest;
      }
    })
  );

  return NextResponse.json({ videos: withPlaybackUrls });
}
