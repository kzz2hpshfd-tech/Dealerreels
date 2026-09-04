"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Play, Home, Compass, PlusSquare, Mail, User, MapPin, ShieldCheck } from "lucide-react";
import VideoThumb from "@/components/VideoThumb";

type Dealership = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  videoCount: number;
  preview: { id: string; caption: string; model: string; thumbnailUrl: string | null; videoUrl: string } | null;
};

export default function DiscoverPage() {
  const { data: session } = useSession();
  const sessionUser = session?.user as any;
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/discover")
      .then((r) => r.json())
      .then((d) => setDealerships(d.dealerships ?? []))
      .catch(() => setDealerships([]))
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

        {/* Dealership list */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <h1 className="text-white font-display text-lg px-1 mb-3">Discover dealerships</h1>

          {loading && <p className="text-white/40 text-xs text-center py-10">Loading…</p>}

          {!loading && dealerships.length === 0 && (
            <p className="text-white/40 text-xs text-center py-10 px-6">
              No dealerships have posted reels yet.
            </p>
          )}

          <div className="space-y-2">
            {dealerships.map((d) => (
              <Link
                key={d.id}
                href={`/feed?dealership=${d.slug}`}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-2.5 hover:bg-white/10 transition-colors"
              >
                <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-neutral-800">
                  {d.preview ? (
                    <VideoThumb
                      videoUrl={d.preview.videoUrl}
                      thumbnailUrl={d.preview.thumbnailUrl}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play size={16} className="text-white/30 fill-white/30" strokeWidth={0} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold truncate">{d.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={10} className="text-white/40 shrink-0" />
                    <span className="text-white/50 text-[11px] truncate">
                      {d.city}, {d.state}
                    </span>
                  </div>
                  <p className="text-red-400 text-[11px] mt-0.5">
                    {d.videoCount} reel{d.videoCount === 1 ? "" : "s"}
                  </p>
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
