import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractR2Key, getPlaybackUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Public -- powers the Discover page. Only dealerships with at least one
// ready video show up, each with their most recent reel attached so a
// shopper can preview before tapping through to that dealership's feed.
export async function GET() {
  const dealerships = await db.dealership.findMany({
    where: { videos: { some: { status: "READY" } } },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      state: true,
      videos: {
        where: { status: "READY" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, caption: true, model: true, thumbnailUrl: true, videoUrl: true },
      },
      _count: { select: { videos: { where: { status: "READY" } } } },
    },
    orderBy: { name: "asc" },
  });

  const withPlaybackUrls = await Promise.all(
    dealerships.map(async (d) => {
      const preview = d.videos[0];
      if (!preview) return { ...d, videos: undefined, videoCount: d._count.videos, preview: null };
      const key = extractR2Key(preview.videoUrl);
      let videoUrl = preview.videoUrl;
      if (key) {
        try {
          videoUrl = await getPlaybackUrl(key);
        } catch {
          // fall through with the stored URL
        }
      }
      return {
        id: d.id,
        name: d.name,
        slug: d.slug,
        city: d.city,
        state: d.state,
        videoCount: d._count.videos,
        preview: { ...preview, videoUrl },
      };
    })
  );

  return NextResponse.json({ dealerships: withPlaybackUrls });
}
