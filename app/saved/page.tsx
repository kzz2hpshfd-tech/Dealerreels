"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bookmark } from "lucide-react";

type SavedVideo = {
  id: string;
  caption: string;
  model: string;
  videoUrl: string;
  seller: { id: string; name: string };
  dealership: { id: string; name: string };
};

export default function SavedPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [videos, setVideos] = useState<SavedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.push("/login");
  }, [sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/saved")
      .then((r) => r.json())
      .then((d) => setVideos(d.videos ?? []))
      .finally(() => setLoading(false));
  }, [sessionStatus]);

  async function unsave(videoId: string) {
    setVideos((vs) => vs.filter((v) => v.id !== videoId));
    const res = await fetch(`/api/videos/${videoId}/save`, { method: "POST" });
    if (!res.ok) {
      // couldn't unsave -- refetch to recover accurate state
      fetch("/api/saved")
        .then((r) => r.json())
        .then((d) => setVideos(d.videos ?? []));
    }
  }

  if (sessionStatus !== "authenticated") {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center text-sm text-white/50">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white flex justify-center">
      <div className="w-full max-w-sm min-h-screen border-x border-white/10">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <Link href="/feed" className="text-white/70">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-semibold">Saved</h1>
        </div>

        {loading && <p className="text-white/40 text-xs text-center py-10">Loading…</p>}

        {!loading && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center text-white/40 px-8 text-center gap-2 py-16">
            <Bookmark size={22} className="text-white/20" />
            <p className="text-sm">Nothing saved yet.</p>
            <p className="text-xs text-white/30">Tap the bookmark icon on a reel to save it here.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-0.5 p-0.5">
          {videos.map((v) => (
            <div key={v.id} className="relative aspect-[9/16] bg-neutral-900">
              <video src={v.videoUrl} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <button
                onClick={() => unsave(v.id)}
                aria-label="Unsave"
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
              >
                <Bookmark size={12} className="fill-yellow-400 text-yellow-400" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-1.5">
                <p className="text-[10px] text-white/60 truncate">{v.dealership.name}</p>
                <p className="text-[11px] text-white leading-tight line-clamp-2">{v.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
