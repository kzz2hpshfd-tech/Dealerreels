"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "SALESPERSON" | "DEALERSHIP_ADMIN" | "PLATFORM_ADMIN" | "SHOPPER";
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  dealership: { id: string; name: string; city: string; state: string } | null;
  _count: { videos: number };
};

const TABS = ["ALL", "DEALERS", "CUSTOMERS", "ADMINS"] as const;

function matchesTab(u: AdminUser, tab: (typeof TABS)[number]) {
  if (tab === "ALL") return true;
  if (tab === "DEALERS") return u.role === "SALESPERSON" || u.role === "DEALERSHIP_ADMIN";
  if (tab === "CUSTOMERS") return u.role === "SHOPPER";
  return u.role === "PLATFORM_ADMIN";
}

export default function AdminUsersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.push("/login");
  }, [sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setUsers(d.users ?? []);
      })
      .finally(() => setLoading(false));
  }, [sessionStatus]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => matchesTab(u, tab))
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, tab, query]);

  if (sessionStatus !== "authenticated") {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center text-sm text-white/50">Loading…</div>;
  }

  const isAdmin = (session?.user as any)?.role === "PLATFORM_ADMIN";

  return (
    <div className="min-h-screen bg-black text-white flex justify-center">
      <div className="w-full max-w-md min-h-screen border-x border-white/10">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <Link href="/feed" className="text-white/70">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-semibold flex-1">All Users</h1>
          <Link href="/admin/dealers" className="text-[11px] text-white/50 underline">
            Verify Dealers
          </Link>
        </div>

        {!isAdmin && (
          <p className="text-white/40 text-xs text-center py-10 px-6">
            {error || "You don't have admin access to this page."}
          </p>
        )}

        {isAdmin && (
          <>
            <div className="px-4 pt-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder-white/30"
              />
            </div>

            <div className="flex gap-1.5 px-4 pt-2 pb-2 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full border ${
                    tab === t ? "bg-red-600 border-red-600" : "bg-transparent border-white/15 text-white/60"
                  }`}
                >
                  {t[0] + t.slice(1).toLowerCase()}
                  {t !== "ALL" ? ` (${users.filter((u) => matchesTab(u, t)).length})` : ` (${users.length})`}
                </button>
              ))}
            </div>

            {loading && <p className="text-white/40 text-xs text-center py-10">Loading…</p>}

            {!loading && visible.length === 0 && (
              <p className="text-white/40 text-xs text-center py-10 px-6">No matching users.</p>
            )}

            <div className="divide-y divide-white/10">
              {visible.map((u) => (
                <div key={u.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{u.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-white/50">
                      {u.role.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50">{u.email}</p>
                  {u.phone && <p className="text-[11px] text-white/50">{u.phone}</p>}
                  {u.dealership && (
                    <p className="text-[11px] text-white/50">
                      {u.dealership.name} &middot; {u.dealership.city}, {u.dealership.state}
                    </p>
                  )}
                  {(u.role === "SALESPERSON" || u.role === "DEALERSHIP_ADMIN") && (
                    <p className="text-[10px] text-white/30">
                      {u.verificationStatus} &middot; {u._count.videos} reel{u._count.videos === 1 ? "" : "s"} posted
                    </p>
                  )}
                  <p className="text-[10px] text-white/30">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
