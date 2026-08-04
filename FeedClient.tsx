"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Heart, MessageCircle, Share2, Play, Home, Compass,
  PlusSquare, Mail, User, Sparkles, MapPin, X, Check, CreditCard,
} from "lucide-react";

const MODELS = ["All models", "Ram 1500", "Grand Cherokee", "Compass", "Durango", "Challenger", "Wrangler"];

type Video = {
  id: string;
  caption: string;
  model: string;
  tags: string[];
  videoUrl: string;
  thumbnailUrl: string | null;
  seller: { id: string; name: string; avatarInitials: string | null };
  dealership: { id: string; name: string; creditApplyUrl: string | null };
  _count: { likes: number; comments: number };
  matchScore?: number | null;
};

export default function FeedClient() {
  const { data: session } = useSession();
  const [videos, setVideos] = useState<Video[]>([]);
  const [dealerships, setDealerships] = useState<{ id: string; name: string }[]>([]);
  const [dealershipId, setDealershipId] = useState<string>("");
  const [model, setModel] = useState("All models");
  const [vibe, setVibe] = useState("");
  const [vibeLoading, setVibeLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // load dealerships for the filter list
  useEffect(() => {
    fetch("/api/dealerships")
      .then((r) => r.json())
      .then((d) => setDealerships(d.dealerships ?? []))
      .catch(() => {});
  }, []);

  // load feed whenever filters change (and vibe search is empty)
  const loadFeed = useCallback(async () => {
    const params = new URLSearchParams();
    if (dealershipId) params.set("dealershipId", dealershipId);
    if (model !== "All models") params.set("model", model);
    const res = await fetch(`/api/videos?${params.toString()}`);
    const data = await res.json();
    setVideos(data.videos ?? []);
  }, [dealershipId, model]);

  useEffect(() => {
    if (!vibe.trim()) loadFeed();
  }, [loadFeed, vibe]);

  // debounced vibe search against the real Claude-powered endpoint
  useEffect(() => {
    if (!vibe.trim()) return;
    setVibeLoading(true);
    const handle = setTimeout(async () => {
      const res = await fetch("/api/vibe-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: vibe, dealershipId: dealershipId || undefined }),
      });
      const data = await res.json();
      setVideos(data.videos ?? []);
      setVibeLoading(false);
    }, 500);
    return () => clearTimeout(handle);
  }, [vibe, dealershipId]);

  const toggleFollow = async (sellerId: string) => {
    setFollowing((f) => ({ ...f, [sellerId]: !f[sellerId] }));
    const res = await fetch(`/api/users/${sellerId}/follow`, { method: "POST" });
    if (!res.ok) setFollowing((f) => ({ ...f, [sellerId]: !f[sellerId] })); // revert on failure
  };

  const toggleLike = async (videoId: string) => {
    setLiked((l) => ({ ...l, [videoId]: !l[videoId] }));
    const res = await fetch(`/api/videos/${videoId}/like`, { method: "POST" });
    if (!res.ok) setLiked((l) => ({ ...l, [videoId]: !l[videoId] }));
  };

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setActiveIdx(Math.round(el.scrollTop / el.clientHeight));
  };

  if (!session) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-black text-white px-6 text-center">
        <h1 className="font-display text-2xl">
          DEALER<span className="text-red-500">REELS</span>
        </h1>
        <p className="text-white/60 text-sm">Sign in to see reels from your dealership network.</p>
        <Link href="/login" className="bg-red-600 px-5 py-2 rounded-full text-sm font-semibold">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <div className="relative w-full max-w-[420px] h-full bg-neutral-950 overflow-hidden shadow-2xl">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-30 px-3 pt-4 pb-3 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-md bg-red-600 flex items-center justify-center">
                <Play size={14} className="text-white fill-white" strokeWidth={0} />
              </div>
              <span className="text-white font-display text-[15px] tracking-tight">
                DEALER<span className="text-red-500">REELS</span>
              </span>
            </div>
            <button onClick={() => signOut()} className="text-white/40 text-[11px] underline">
              Sign out
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-3 py-2 border border-white/10">
              <Sparkles size={15} className="text-red-400 shrink-0" />
              <input
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="Search a vibe: weekend, towing, budget..."
                className="bg-transparent text-white text-[13px] placeholder-white/40 outline-none w-full"
              />
              {vibe && (
                <button onClick={() => setVibe("")} className="text-white/50 hover:text-white shrink-0">
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters((s) => !s)}
              className="shrink-0 w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white"
            >
              <MapPin size={16} />
            </button>
          </div>

          {showFilters && (
            <div className="mt-2 flex flex-col gap-2 bg-neutral-900/95 border border-white/10 rounded-2xl p-3">
              <FilterRow
                label="Dealership"
                value={dealershipId}
                options={[{ id: "", name: "All dealerships" }, ...dealerships]}
                onChange={setDealershipId}
              />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Model</p>
                <div className="flex flex-wrap gap-1.5">
                  {MODELS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setModel(m)}
                      className={`text-[12px] px-2.5 py-1 rounded-full border ${
                        model === m ? "bg-red-600 border-red-600" : "bg-transparent border-white/15 text-white/70"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {vibe.trim() && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-red-300/90">
              <Sparkles size={11} />
              <span>{vibeLoading ? "matching your vibe…" : "sorted by AI vibe match"}</span>
            </div>
          )}
        </div>

        {/* Feed */}
        <div
          ref={containerRef}
          onScroll={onScroll}
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
          style={{ scrollbarWidth: "none" }}
        >
          {videos.length === 0 && (
            <div className="h-full w-full flex flex-col items-center justify-center text-white/60 px-8 text-center gap-2">
              <p className="text-sm">No reels match yet.</p>
              <p className="text-xs text-white/30">Try a different model, dealership, or vibe.</p>
            </div>
          )}
          {videos.map((v, i) => (
            <ReelCard
              key={v.id}
              video={v}
              active={i === activeIdx}
              isFollowing={!!following[v.seller.id]}
              onFollow={() => toggleFollow(v.seller.id)}
              isLiked={!!liked[v.id]}
              onLike={() => toggleLike(v.id)}
              matchScore={vibe.trim() ? v.matchScore ?? null : null}
            />
          ))}
        </div>

        {/* Bottom nav */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/90 backdrop-blur border-t border-white/10 px-2 pt-2 pb-3 flex items-center justify-between">
          <NavIcon icon={<Home size={20} />} label="Home" active />
          <NavIcon icon={<Compass size={20} />} label="Discover" />
          <Link href="/upload" className="w-9 h-8 rounded-lg bg-red-600 flex items-center justify-center -mt-1">
            <PlusSquare size={18} className="text-white" />
          </Link>
          <NavIcon icon={<Mail size={20} />} label="Inbox" />
          <NavIcon icon={<User size={20} />} label="Profile" />
        </div>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.id || "all"}
            onClick={() => onChange(opt.id)}
            className={`text-[12px] px-2.5 py-1 rounded-full border ${
              value === opt.id ? "bg-red-600 border-red-600" : "bg-transparent border-white/15 text-white/70"
            }`}
          >
            {opt.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function NavIcon({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`flex flex-col items-center gap-0.5 ${active ? "text-white" : "text-white/40"}`}>
      {icon}
      <span className="text-[9px]">{label}</span>
    </button>
  );
}

function ReelCard({
  video,
  active,
  isFollowing,
  onFollow,
  isLiked,
  onLike,
  matchScore,
}: {
  video: Video;
  active: boolean;
  isFollowing: boolean;
  onFollow: () => void;
  isLiked: boolean;
  onLike: () => void;
  matchScore: number | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (active) el.play().catch(() => {});
    else el.pause();
  }, [active]);

  const likeCount = video._count.likes + (isLiked ? 1 : 0);
  const applyUrl = video.dealership.creditApplyUrl || "#";

  return (
    <div className="h-full w-full snap-start relative flex items-end bg-black">
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl ?? undefined}
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

      {matchScore !== null && (
        <div className="absolute top-[128px] left-3 z-20 flex items-center gap-1 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full border border-red-500/40">
          <Sparkles size={11} className="text-red-400" />
          <span className="text-[11px] text-red-300">{matchScore}% match</span>
        </div>
      )}

      {/* Right action rail */}
      <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-white/15 border-2 border-white flex items-center justify-center text-white text-[11px] font-bold">
            {video.seller.avatarInitials ?? video.seller.name.slice(0, 2).toUpperCase()}
          </div>
          <button
            onClick={onFollow}
            className={`w-5 h-5 rounded-full flex items-center justify-center -mt-2 border-2 border-black ${
              isFollowing ? "bg-emerald-500" : "bg-red-600"
            }`}
          >
            {isFollowing ? <Check size={11} className="text-white" /> : <span className="text-white text-[13px] leading-none -mt-px">+</span>}
          </button>
        </div>

        <button onClick={onLike} className="flex flex-col items-center gap-1 text-white">
          <Heart size={26} className={isLiked ? "fill-red-500 text-red-500" : "text-white"} />
          <span className="text-[11px]">{likeCount.toLocaleString()}</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-white">
          <MessageCircle size={25} />
          <span className="text-[11px]">{video._count.comments}</span>
        </button>
        <a
          href={applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 text-white"
          aria-label={`Apply for credit for this ${video.model}`}
        >
          <span className="relative w-11 h-11 rounded-full bg-red-600 border-2 border-white/80 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
            <CreditCard size={19} className="text-white relative" />
          </span>
          <span className="text-[10px] font-semibold tracking-tight leading-none">APPLY</span>
        </a>
        <button className="flex flex-col items-center gap-1 text-white">
          <Share2 size={24} />
        </button>
      </div>

      {/* Bottom info */}
      <div className="relative z-20 px-3 pb-24 pt-16 w-[78%]">
        <p className="text-white font-display text-[15px] tracking-tight">{video.seller.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 mb-2">
          <MapPin size={11} className="text-white/50" />
          <span className="text-[11px] text-white/60">{video.dealership.name}</span>
          <span className="text-white/30">•</span>
          <span className="text-[11px] text-red-400">{video.model}</span>
        </div>
        <p className="text-white/90 text-[13px] leading-snug">{video.caption}</p>
        <p className="text-red-300/80 text-[12px] mt-1">{video.tags.map((t) => `#${t}`).join(" ")}</p>
      </div>
    </div>
  );
}
