"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Conversation = {
  user: { id: string; name: string; avatarInitials: string | null };
  lastMessage: { body: string; createdAt: string; fromMe: boolean };
  unreadCount: number;
};

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function MessagesPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.push("/login");
  }, [sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/messages/conversations")
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations ?? []))
      .finally(() => setLoading(false));
  }, [sessionStatus]);

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
          <h1 className="text-sm font-semibold">Messages</h1>
        </div>

        {loading && <p className="text-white/40 text-xs text-center py-10">Loading…</p>}

        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center text-white/40 px-8 text-center gap-2 py-16">
            <p className="text-sm">No conversations yet.</p>
            <p className="text-xs text-white/30">Tap a seller's avatar on a reel to start one.</p>
          </div>
        )}

        <div className="divide-y divide-white/10">
          {conversations.map((c) => (
            <Link
              key={c.user.id}
              href={`/messages/${c.user.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/5"
            >
              <div className="w-11 h-11 shrink-0 rounded-full bg-white/15 flex items-center justify-center text-white text-[11px] font-bold">
                {c.user.avatarInitials ?? c.user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{c.user.name}</p>
                  <span className="text-[10px] text-white/40 shrink-0">{timeAgo(c.lastMessage.createdAt)}</span>
                </div>
                <p className={`text-xs truncate ${c.unreadCount > 0 ? "text-white" : "text-white/50"}`}>
                  {c.lastMessage.fromMe ? "You: " : ""}
                  {c.lastMessage.body}
                </p>
              </div>
              {c.unreadCount > 0 && (
                <span className="shrink-0 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
                  {c.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
