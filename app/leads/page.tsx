"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Mail } from "lucide-react";

type Lead = {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  status: "NEW" | "CONTACTED" | "CLOSED";
  video: { id: string; caption: string; model: string } | null;
};

export default function LeadsPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.push("/login");
  }, [sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/leads")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setLeads(d.leads ?? []);
      })
      .finally(() => setLoading(false));
  }, [sessionStatus]);

  async function markContacted(id: string) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status: "CONTACTED" } : l)));
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CONTACTED" }),
    });
    if (!res.ok) {
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status: "NEW" } : l)));
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
          <h1 className="text-sm font-semibold">My Leads</h1>
        </div>

        {loading && <p className="text-white/40 text-xs text-center py-10">Loading…</p>}

        {error && <p className="text-white/40 text-xs text-center py-10 px-6">{error}</p>}

        {!loading && !error && leads.length === 0 && (
          <div className="flex flex-col items-center justify-center text-white/40 px-8 text-center gap-2 py-16">
            <p className="text-sm">No leads yet.</p>
            <p className="text-xs text-white/30">
              When someone taps APPLY on one of your reels, they'll show up here.
            </p>
          </div>
        )}

        <div className="divide-y divide-white/10">
          {leads.map((l) => (
            <div key={l.id} className="px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{l.name}</p>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    l.status === "NEW"
                      ? "border-red-500/50 text-red-300"
                      : l.status === "CONTACTED"
                      ? "border-emerald-500/50 text-emerald-300"
                      : "border-white/20 text-white/40"
                  }`}
                >
                  {l.status}
                </span>
              </div>
              {l.video && (
                <p className="text-[11px] text-white/50">
                  {l.video.model} &middot; {l.video.caption}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-white/70">
                <a href={`tel:${l.phone}`} className="flex items-center gap-1 underline">
                  <Phone size={11} /> {l.phone}
                </a>
                {l.email && (
                  <a href={`mailto:${l.email}`} className="flex items-center gap-1 underline">
                    <Mail size={11} /> {l.email}
                  </a>
                )}
              </div>
              {l.notes && <p className="text-[11px] text-white/50 italic">"{l.notes}"</p>}
              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] text-white/30">{new Date(l.createdAt).toLocaleString()}</p>
                {l.status === "NEW" && (
                  <button onClick={() => markContacted(l.id)} className="text-[11px] text-emerald-400 underline">
                    Mark contacted
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
