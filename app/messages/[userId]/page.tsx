"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  recipientId: string;
};

type OtherUser = { id: string; name: string; avatarInitials: string | null };

export default function ThreadPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const otherId = params.userId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const myId = (session?.user as any)?.id;

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.push("/login");
  }, [sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch(`/api/messages/${otherId}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? []);
        setOtherUser(d.otherUser ?? null);
      })
      .finally(() => setLoading(false));
  }, [sessionStatus, otherId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/messages/${otherId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send message.");
        return;
      }
      setMessages((m) => [...m, data.message]);
      setText("");
    } catch {
      setError("Could not send message.");
    } finally {
      setSending(false);
    }
  }

  if (sessionStatus !== "authenticated") {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center text-sm text-white/50">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white flex justify-center">
      <div className="w-full max-w-sm min-h-screen border-x border-white/10 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <Link href="/messages" className="text-white/70">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-[10px] font-bold">
            {otherUser?.avatarInitials ?? otherUser?.name?.slice(0, 2).toUpperCase() ?? "?"}
          </div>
          <h1 className="text-sm font-semibold">{otherUser?.name ?? "…"}</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading && <p className="text-white/40 text-xs text-center py-10">Loading…</p>}
          {!loading && messages.length === 0 && (
            <p className="text-white/40 text-xs text-center py-10">
              Say hello to {otherUser?.name ?? "this seller"}.
            </p>
          )}
          {messages.map((m) => {
            const fromMe = m.senderId === myId;
            return (
              <div key={m.id} className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    fromMe ? "bg-red-600 text-white" : "bg-white/10 text-white"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={submit} className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message…"
            className="flex-1 bg-white/10 border border-white/10 rounded-full px-3 py-2 text-sm text-white placeholder-white/40 outline-none"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="w-9 h-9 shrink-0 rounded-full bg-red-600 disabled:opacity-40 flex items-center justify-center text-white"
          >
            <Send size={15} />
          </button>
        </form>
        {error && <p className="text-red-400 text-[11px] px-4 pb-2">{error}</p>}
      </div>
    </div>
  );
}
