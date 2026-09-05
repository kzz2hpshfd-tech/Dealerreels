"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Play, Home, Compass, PlusSquare, Mail, User, Heart, ShieldCheck } from "lucide-react";
import VideoThumb from "@/components/VideoThumb";

type DiscoverVideo = {
  id: string;
  caption: string;
  model: string;
  thumbnailUrl: string | null;
  videoUrl: string;
  dealership: { name: string };
  _count: { likes: number };
};

export default function DiscoverPage() {
  const { data: session } = useSession();
  const sessionUser = session?.user as any;
  const [videos, setVideos] = useState<DiscoverVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/discover")
      .then((r) => r.json())
      .then((d) => setVideos(d.videos ?? []))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <div className="relative w-full max-w-[420px] h-full bg-neutral-950 overflow-hidden shadow-2xl flex flex-col">
        {/* Top bar */}
        <div className="shrink-0 px-4 pt-4 pb-3 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-md bg-red-600 flex items-center justify-center">
              <Play size={14} className="text-white fill-white" strokeWidth={0} />
            </div>
            <span className="text-white font-display text-[15px] tracking-tight">
              DEALER<span className="text-red-500">REELS</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {sessionUser?.role === "PLATFORM_ADMIN" && (
              <Link href="/admin/users" className="text-white/70" aria-label="Admin: all users">
                <ShieldCheck size={16} />
              </Link>
            )}
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-white/40 text-[11px] underline">
              Sign out
            </button>
          </div>
        </div>

        {/* Discovery grid -- Explore-style, three columns of portrait tiles */}
        <div className="flex-1 overflow-y-auto">
          {loading && <p className="text-white/40 text-xs text-center py-10">Loading…</p>}

          {!loading && videos.length === 0 && (
            <p className="text-white/40 text-xs text-center py-10 px-6">No reels to discover yet.</p>
          )}

          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {videos.map((v) => (
              <Link key={v.id} href={`/feed?v=${v.id}`} className="relative aspect-[3/4] bg-neutral-900 block">
                <VideoThumb videoUrl={v.videoUrl} thumbnailUrl={v.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-1 left-1 right-1 flex items-center gap-1">
                  <Heart size={10} className="text-white fill-white shrink-0" />
                  <span className="text-white text-[10px] font-semibold">{v._count.likes}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="shrink-0 bg-black/90 backdrop-blur border-t border-white/10 px-2 pt-2 pb-3 flex items-center justify-between">
          <NavIcon icon={<Home size={20} />} label="Home" href="/feed" />
          <NavIcon icon={<Compass size={20} />} label="Discover" href="/discover" active />
          <Link href="/upload" className="w-9 h-8 rounded-lg bg-red-600 flex items-center justify-center -mt-1">
            <PlusSquare size={18} className="text-white" />
          </Link>
          <NavIcon icon={<Mail size={20} />} label="Inbox" href="/messages" />
          <NavIcon icon={<User size={20} />} label="Saved" href="/saved" />
        </div>
      </div>
    </div>
  );
}

function NavIcon({
  icon,
  label,
  active,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  href?: string;
}) {
  const className = `flex flex-col items-center gap-0.5 ${active ? "text-white" : "text-white/40"}`;
  if (href) {
    return (
      <Link href={href} className={className}>
        {icon}
        <span className="text-[9px]">{label}</span>
      </Link>
    );
  }
  return (
    <button className={className}>
      {icon}
      <span className="text-[9px]">{label}</span>
    </button>
  );
}
