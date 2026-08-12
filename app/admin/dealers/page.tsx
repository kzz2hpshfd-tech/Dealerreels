"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, X, RotateCcw } from "lucide-react";

type Dealer = {
  id: string;
  name: string;
  email: string;
  role: string;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  dealership: { id: string; name: string; city: string; state: string } | null;
  _count: { videos: number };
};

const FILTERS = ["PENDING", "APPROVED", "REJECTED", "ALL"] as const;

export default function AdminDealersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("PENDING");

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.push("/login");
  }, [sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/admin/dealers")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setDealers(d.dealers ?? []);
      })
      .finally(() => setLoading(false));
  }, [sessionStatus]);

  async function setStatus(id: string, verificationStatus: Dealer["verificationStatus"]) {
    const prev = dealers;
    setDealers((ds) => ds.map((d) => (d.id === id ? { ...d, verificationStatus } : d)));
    const res = await fetch(`/api/admin/dealers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationStatus }),
    });
    if (!res.ok) setDealers(prev);
  }

  if (sessionStatus !== "authenticated") {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center text-sm text-white/50">Loading…</div>;
  }

  const isAdmin = (session?.user as any)?.role === "PLATFORM_ADMIN";
  const visible = filter === "ALL" ? dealers : dealers.filter((d) => d.verificationStatus === filter);

  return (
    <div className="min-h-screen bg-black text-white flex justify-center">
      <div className="w-full max-w-md min-h-screen border-x border-white/10">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <Link href="/feed" className="text-white/70">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-semibold">Verify Dealers</h1>
        </div>

        {!isAdmin && (
          <p className="text-white/40 text-xs text-center py-10 px-6">
            {error || "You don't have admin access to this page."}
          </p>
        )}

        {isAdmin && (
          <>
            <div className="flex gap-1.5 px-4 pt-3 pb-2 overflow-x-auto">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full border ${
                    filter === f ? "bg-red-600 border-red-600" : "bg-transparent border-white/15 text-white/60"
                  }`}
                >
                  {f}
                  {f === "PENDING" && dealers.filter((d) => d.verificationStatus === "PENDING").length > 0
                    ? ` (${dealers.filter((d) => d.verificationStatus === "PENDING").length})`
                    : ""}
                </button>
              ))}
            </div>

            {loading && <p className="text-white/40 text-xs text-center py-10">Loading…</p>}

            {!loading && visible.length === 0 && (
              <p className="text-white/40 text-xs text-center py-10 px-6">Nothing here.</p>
            )}

            <div className="divide-y divide-white/10">
              {visible.map((d) => (
                <div key={d.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{d.name}</p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        d.verificationStatus === "PENDING"
                          ? "border-yellow-500/50 text-yellow-300"
                          : d.verificationStatus === "APPROVED"
                          ? "border-emerald-500/50 text-emerald-300"
                          : "border-red-500/50 text-red-300"
                      }`}
                    >
                      {d.verificationStatus}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50">{d.email}</p>
                  {d.dealership && (
                    <p className="text-[11px] text-white/50">
                      {d.dealership.name} &middot; {d.dealership.city}, {d.dealership.state}
                    </p>
                  )}
                  <p className="text-[10px] text-white/30">
                    Joined {new Date(d.createdAt).toLocaleDateString()} &middot; {d._count.videos} reel
                    {d._count.videos === 1 ? "" : "s"} posted
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    {d.verificationStatus !== "APPROVED" && (
                      <button
                        onClick={() => setStatus(d.id, "APPROVED")}
                        className="flex items-center gap-1 text-[11px] text-emerald-400 border border-emerald-500/40 rounded-full px-2.5 py-1"
                      >
                        <Check size={11} /> Approve
                      </button>
                    )}
                    {d.verificationStatus !== "REJECTED" && (
                      <button
                        onClick={() => setStatus(d.id, "REJECTED")}
                        className="flex items-center gap-1 text-[11px] text-red-400 border border-red-500/40 rounded-full px-2.5 py-1"
                      >
                        <X size={11} /> Reject
                      </button>
                    )}
                    {d.verificationStatus !== "PENDING" && (
                      <button
                        onClick={() => setStatus(d.id, "PENDING")}
                        className="flex items-center gap-1 text-[11px] text-white/40 border border-white/15 rounded-full px-2.5 py-1"
                      >
                        <RotateCcw size={11} /> Reset
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
