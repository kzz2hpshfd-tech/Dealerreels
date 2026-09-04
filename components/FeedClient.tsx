"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Heart, MessageCircle, Share2, Play, Home, Compass,
  PlusSquare, Mail, User, Sparkles, MapPin, X, Check, CreditCard, Send,
  Volume2, VolumeX, Trash2, Bookmark, CheckCircle2, Bell, ShieldCheck,
} from "lucide-react";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string; avatarInitials: string | null };
};

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
  const [dealerships, setDealerships] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [dealershipId, setDealershipId] = useState<string>("");
  const [model, setModel] = useState("All models");
  const [vibe, setVibe] = useState("");
  const [vibeLoading, setVibeLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [leadFormOpenFor, setLeadFormOpenFor] = useState<string | null>(null);
  const [newLeadCount, setNewLeadCount] = useState(0);
  // Browsers require video to start muted for autoplay to work without a
  // click. Once the user explicitly unmutes, that's a real user gesture,
  // so it's allowed to stay unmuted across cards.
  const [muted, setMuted] = useState(true);
  const [shareMessage, setShareMessage] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Lets a badge embedded on a dealership's own website (e.g. /feed?dealership=david-stanley-dodge)
  // land the visitor on just that dealership's reels -- read once on mount,
  // resolved server-side by slug so the URL never needs an internal ID.
  const [urlDealershipSlug] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("dealership") || "";
  });

  // load dealerships for the filter list
  useEffect(() => {
    fetch("/api/dealerships")
      .then((r) => r.json())
      .then((d) => setDealerships(d.dealerships ?? []))
      .catch(() => {});
  }, []);

  const urlDealership = urlDealershipSlug
    ? dealerships.find((d) => d.slug === urlDealershipSlug)
    : undefined;

  // Poll for new leads while a dealer account has the app open -- the
  // closest thing to a live notification without a texting/email
  // provider integration.
  const sessionUser = session?.user as any;
  const isDealerAccount = !!sessionUser?.dealershipId && sessionUser?.role !== "SHOPPER";
  useEffect(() => {
    if (!isDealerAccount) return;
    let cancelled = false;
    const checkLeads = () => {
      fetch("/api/leads")
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          const count = (d.leads ?? []).filter((l: any) => l.status === "NEW").length;
          setNewLeadCount(count);
        })
        .catch(() => {});
    };
    checkLeads();
    const interval = setInterval(checkLeads, 45000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isDealerAccount]);

  // load feed whenever filters change (and vibe search is empty)
  const loadFeed = useCallback(async () => {
    const params = new URLSearchParams();
    if (dealershipId) params.set("dealershipId", dealershipId);
    else if (urlDealershipSlug) params.set("dealershipSlug", urlDealershipSlug);
    if (model !== "All models") params.set("model", model);
    const res = await fetch(`/api/videos?${params.toString()}`);
    const data = await res.json();
    setVideos(data.videos ?? []);
  }, [dealershipId, model, urlDealershipSlug]);

  useEffect(() => {
    if (!vibe.trim()) loadFeed();
  }, [loadFeed, vibe]);

  // Jump to a specific reel when opened via a shared /feed?v=<id> link, then
  // clean the URL so it doesn't keep re-jumping on later filter refetches.
  useEffect(() => {
    if (!videos.length) return;
    const target = new URLSearchParams(window.location.search).get("v");
    if (!target) return;
    const idx = videos.findIndex((v) => v.id === target);
    if (idx === -1) return;
    setActiveIdx(idx);
    const el = containerRef.current;
    if (el) el.scrollTop = idx * el.clientHeight;
    window.history.replaceState({}, "", "/feed");
  }, [videos]);

  const shareVideo = async (video: Video) => {
    const url = `${window.location.origin}/feed?v=${video.id}`;
    let shared = false;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${video.seller.name} on DealerReels`, text: video.caption, url });
        shared = true;
      } catch {
        // user cancelled the native share sheet -- not an error, and not a share
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShareMessage("Link copied!");
        shared = true;
      } catch {
        setShareMessage("Could not copy link.");
      }
      setTimeout(() => setShareMessage(""), 2000);
    }
    if (shared) {
      fetch(`/api/videos/${video.id}/share`, { method: "POST" }).catch(() => {});
    }
  };

  // debounced vibe search against the real Claude-powered endpoint
  useEffect(() => {
    if (!vibe.trim()) return;
    setVibeLoading(true);
    const handle = setTimeout(async () => {
      const res = await fetch("/api/vibe-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: vibe,
          dealershipId: dealershipId || undefined,
          dealershipSlug: !dealershipId && urlDealershipSlug ? urlDealershipSlug : undefined,
        }),
      });
      const data = await res.json();
      setVideos(data.videos ?? []);
      setVibeLoading(false);
    }, 500);
    return () => clearTimeout(handle);
  }, [vibe, dealershipId, urlDealershipSlug]);

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

  const toggleSave = async (videoId: string) => {
    setSaved((s) => ({ ...s, [videoId]: !s[videoId] }));
    const res = await fetch(`/api/videos/${videoId}/save`, { method: "POST" });
    if (!res.ok) setSaved((s) => ({ ...s, [videoId]: !s[videoId] }));
  };

  const deleteVideo = async (videoId: string) => {
    if (!window.confirm("Delete this reel? This can't be undone.")) return;
    const res = await fetch(`/api/videos/${videoId}`, { method: "DELETE" });
    if (res.ok) setVideos((vs) => vs.filter((v) => v.id !== videoId));
  };

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setActiveIdx(Math.round(el.scrollTop / el.clientHeight));
  };

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
            <div className="flex items-center gap-3">
              {sessionUser?.role === "PLATFORM_ADMIN" && (
                <Link href="/admin/users" className="text-white/70" aria-label="Admin: all users">
                  <ShieldCheck size={16} />
                </Link>
              )}
              {isDealerAccount && (
                <Link href="/leads" className="relative text-white/70">
                  <Bell size={16} />
                  {newLeadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-red-600 text-white text-[9px] leading-[15px] text-center">
                      {newLeadCount}
                    </span>
                  )}
                </Link>
              )}
              <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-white/40 text-[11px] underline">
                Sign out
              </button>
            </div>
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

          {urlDealership && !dealershipId && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/60">
              <MapPin size={11} className="text-red-400" />
              <span>
                Showing reels from <span className="text-white font-semibold">{urlDealership.name}</span>
              </span>
            </div>
          )}

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
              shouldLoad={Math.abs(i - activeIdx) <= 1}
              isFollowing={!!following[v.seller.id]}
              onFollow={() => toggleFollow(v.seller.id)}
              isLiked={!!liked[v.id]}
              onLike={() => toggleLike(v.id)}
              isSaved={!!saved[v.id]}
              onSave={() => toggleSave(v.id)}
              commentCount={commentCounts[v.id] ?? v._count.comments}
              onOpenComments={() => setCommentsOpenFor(v.id)}
              matchScore={vibe.trim() ? v.matchScore ?? null : null}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              currentUserId={(session?.user as any)?.id}
              onDelete={() => deleteVideo(v.id)}
              onOpenLeadForm={() => setLeadFormOpenFor(v.id)}
              onShare={() => shareVideo(v)}
            />
          ))}
        </div>

        {shareMessage && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-black/90 border border-white/15 rounded-full px-3 py-1.5 text-[12px] text-white">
            {shareMessage}
          </div>
        )}

        {leadFormOpenFor && (
          <LeadFormSheet
            video={videos.find((v) => v.id === leadFormOpenFor)!}
            onClose={() => setLeadFormOpenFor(null)}
          />
        )}

        {commentsOpenFor && (
          <CommentsSheet
            videoId={commentsOpenFor}
            isSignedIn={!!session}
            currentUserId={(session?.user as any)?.id}
            onClose={() => setCommentsOpenFor(null)}
            onCommentPosted={() =>
              setCommentCounts((c) => ({ ...c, [commentsOpenFor]: (c[commentsOpenFor] ?? 0) + 1 }))
            }
            onCommentDeleted={() =>
              setCommentCounts((c) => ({ ...c, [commentsOpenFor]: Math.max(0, (c[commentsOpenFor] ?? 1) - 1) }))
            }
          />
        )}

        {/* Bottom nav */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/90 backdrop-blur border-t border-white/10 px-2 pt-2 pb-3 flex items-center justify-between">
          <NavIcon icon={<Home size={20} />} label="Home" href="/feed" active />
          <NavIcon icon={<Compass size={20} />} label="Discover" href="/discover" />
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

function ReelCard({
  video,
  active,
  shouldLoad,
  isFollowing,
  onFollow,
  isLiked,
  onLike,
  isSaved,
  onSave,
  commentCount,
  onOpenComments,
  matchScore,
  muted,
  onToggleMute,
  currentUserId,
  onDelete,
  onOpenLeadForm,
  onShare,
}: {
  video: Video;
  active: boolean;
  shouldLoad: boolean;
  isFollowing: boolean;
  onFollow: () => void;
  isLiked: boolean;
  onLike: () => void;
  isSaved: boolean;
  onSave: () => void;
  commentCount: number;
  onOpenComments: () => void;
  matchScore: number | null;
  muted: boolean;
  onToggleMute: () => void;
  currentUserId?: string;
  onDelete: () => void;
  onOpenLeadForm: () => void;
  onShare: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (active) el.play().catch(() => {});
    else el.pause();
  }, [active]);

  const likeCount = video._count.likes + (isLiked ? 1 : 0);

  return (
    <div className="h-full w-full snap-start relative flex items-end bg-black">
      <video
        ref={videoRef}
        // Only the active reel and its immediate neighbor load any video
        // bytes at all -- previously every reel in the feed got a src and
        // started fetching simultaneously the moment the feed opened,
        // splitting bandwidth across all of them instead of prioritizing
        // the one actually on screen. The poster still shows immediately
        // either way.
        src={shouldLoad ? video.videoUrl : undefined}
        preload={shouldLoad ? "auto" : "none"}
        poster={video.thumbnailUrl ?? undefined}
        loop
        muted={muted}
        playsInline
        onClick={onToggleMute}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <button
        onClick={onToggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute top-[128px] right-3 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
      >
        {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

      {matchScore !== null && (
        <div className="absolute top-[128px] left-3 z-20 flex items-center gap-1 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full border border-red-500/40">
          <Sparkles size={11} className="text-red-400" />
          <span className="text-[11px] text-red-300">{matchScore}% match</span>
        </div>
      )}

      {/* Right action rail */}
      <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <Link
            href={`/messages/${video.seller.id}`}
            className="w-11 h-11 rounded-full bg-white/15 border-2 border-white flex items-center justify-center text-white text-[11px] font-bold"
          >
            {video.seller.avatarInitials ?? video.seller.name.slice(0, 2).toUpperCase()}
          </Link>
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
        <button onClick={onOpenComments} className="flex flex-col items-center gap-1 text-white">
          <MessageCircle size={25} />
          <span className="text-[11px]">{commentCount}</span>
        </button>
        <button onClick={onSave} className="flex flex-col items-center gap-1 text-white" aria-label={isSaved ? "Unsave" : "Save"}>
          <Bookmark size={24} className={isSaved ? "fill-yellow-400 text-yellow-400" : "text-white"} />
        </button>
        <button
          onClick={onOpenLeadForm}
          className="flex flex-col items-center gap-1 text-white"
          aria-label={`Ask about financing for this ${video.model}`}
        >
          <span className="relative w-11 h-11 rounded-full bg-red-600 border-2 border-white/80 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
            <CreditCard size={19} className="text-white relative" />
          </span>
          <span className="text-[10px] font-semibold tracking-tight leading-none">APPLY</span>
        </button>
        <button onClick={onShare} className="flex flex-col items-center gap-1 text-white" aria-label="Share this reel">
          <Share2 size={24} />
        </button>
        {currentUserId && video.seller.id === currentUserId && (
          <button onClick={onDelete} className="flex flex-col items-center gap-1 text-white/70" aria-label="Delete reel">
            <Trash2 size={22} />
          </button>
        )}
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

function CommentsSheet({
  videoId,
  isSignedIn,
  currentUserId,
  onClose,
  onCommentPosted,
  onCommentDeleted,
}: {
  videoId: string;
  isSignedIn: boolean;
  currentUserId?: string;
  onClose: () => void;
  onCommentPosted: () => void;
  onCommentDeleted: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  async function deleteComment(commentId: string) {
    if (!window.confirm("Delete this comment?")) return;
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) {
      setComments((c) => c.filter((x) => x.id !== commentId));
      onCommentDeleted();
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/videos/${videoId}/comments`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setComments(d.comments ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    setError("");
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not post comment.");
        return;
      }
      setComments((c) => [...c, data.comment]);
      onCommentPosted();
      setText("");
    } catch {
      setError("Could not post comment.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-h-[70%] bg-neutral-950 border-t border-white/10 rounded-t-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="text-white text-sm font-semibold">Comments</p>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading && <p className="text-white/40 text-xs text-center py-4">Loading…</p>}
          {!loading && comments.length === 0 && (
            <p className="text-white/40 text-xs text-center py-4">No comments yet. Be the first to say something.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <div className="w-7 h-7 shrink-0 rounded-full bg-white/15 flex items-center justify-center text-white text-[10px] font-bold">
                {c.user.avatarInitials ?? c.user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[12px]">
                  <span className="font-semibold">{c.user.name}</span>{" "}
                  <span className="text-white/80">{c.body}</span>
                </p>
              </div>
              {currentUserId && c.user.id === currentUserId && (
                <button
                  onClick={() => deleteComment(c.id)}
                  className="shrink-0 text-white/30 hover:text-white/70"
                  aria-label="Delete comment"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-white/10">
          {isSignedIn ? (
            <form onSubmit={submit} className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 bg-white/10 border border-white/10 rounded-full px-3 py-2 text-sm text-white placeholder-white/40 outline-none"
              />
              <button
                type="submit"
                disabled={posting || !text.trim()}
                className="w-9 h-9 shrink-0 rounded-full bg-red-600 disabled:opacity-40 flex items-center justify-center text-white"
              >
                <Send size={15} />
              </button>
            </form>
          ) : (
            <p className="text-white/40 text-xs text-center">
              <Link href="/login" className="underline text-white/70">
                Sign in
              </Link>{" "}
              to leave a comment.
            </p>
          )}
          {error && <p className="text-red-400 text-[11px] mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function LeadFormSheet({ video, onClose }: { video: Video; onClose: () => void }) {
  const { data: session } = useSession();
  const sessionUser = session?.user as any;

  const [name, setName] = useState(sessionUser?.name ?? "");
  const [phone, setPhone] = useState(sessionUser?.phone ?? "");
  const [email, setEmail] = useState(sessionUser?.email ?? "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id, name, phone, email: email || undefined, notes: notes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit your request.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not submit your request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-h-[85%] bg-neutral-950 border-t border-white/10 rounded-t-2xl flex flex-col overflow-y-auto"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="text-white text-sm font-semibold">
            {done ? "Request sent" : `Ask ${video.seller.name} about financing`}
          </p>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center text-center gap-2 px-4 py-10">
            <CheckCircle2 size={32} className="text-emerald-500" />
            <p className="text-white text-sm">
              Thanks, {name.split(" ")[0]}! {video.seller.name} at {video.dealership.name} will reach out about
              the {video.model} soon.
            </p>
            <button onClick={onClose} className="mt-2 text-xs text-white/50 underline">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-4 py-4 space-y-3">
            <p className="text-xs text-white/50">
              We'll pass your info straight to {video.seller.name} so they can call you about financing for this{" "}
              {video.model} -- no need to fill out anything on another site.
            </p>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-white/50">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-white/50">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-white/50">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-white/50">Anything specific? (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
              />
            </div>
            {error && <p className="text-red-400 text-[11px]">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-red-600 disabled:opacity-50 rounded-lg py-2.5 text-sm font-semibold text-white"
            >
              {submitting ? "Sending…" : "Request a call"}
            </button>
            <p className="text-[10px] text-white/30">
              By submitting, you agree to be contacted by {video.dealership.name} about this request.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
