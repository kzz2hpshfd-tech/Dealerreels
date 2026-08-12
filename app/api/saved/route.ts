import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractR2Key, getPlaybackUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const saves = await db.savedVideo.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      video: {
        include: {
          seller: { select: { id: true, name: true, avatarInitials: true } },
          dealership: { select: { id: true, name: true, creditApplyUrl: true } },
          _count: { select: { likes: true, comments: true } },
        },
      },
    },
  });

  const videos = await Promise.all(
    saves.map(async (s) => {
      const key = extractR2Key(s.video.videoUrl);
      if (!key) return s.video;
      try {
        return { ...s.video, videoUrl: await getPlaybackUrl(key) };
      } catch {
        return s.video;
      }
    })
  );

  return NextResponse.json({ videos });
}
