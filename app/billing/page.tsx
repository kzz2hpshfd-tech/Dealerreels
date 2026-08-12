"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

const PLANS = [
  { id: "tier-25", seats: 25, priceUsd: 250 },
  { id: "tier-45", seats: 45, priceUsd: 450 },
];

type BillingInfo = {
  dealershipName: string;
  seatLimit: number | null;
  approvedSeats: number;
  subscriptionStatus: string | null;
};

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center text-sm text-white/50">Loading…</div>}>
      <BillingPageInner />
    </Suspense>
  );
}

function BillingPageInner() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.push("/login");
  }, [sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/billing")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setInfo(d);
      })
      .finally(() => setLoading(false));
  }, [sessionStatus]);

  async function subscribe(planId: string) {
    setCheckoutLoading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start checkout.");
        setCheckoutLoading(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start checkout.");
      setCheckoutLoading(null);
    }
  }

  if (sessionStatus !== "authenticated") {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center text-sm text-white/50">Loading…</div>;
  }

  const checkoutResult = searchParams.get("checkout");

  return (
    <div className="min-h-screen bg-black text-white flex justify-center">
      <div className="w-full max-w-sm min-h-screen border-x border-white/10">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <Link href="/upload" className="text-white/70">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-semibold">Billing</h1>
        </div>

        <div className="px-4 py-4 space-y-4">
          {checkoutResult === "success" && (
            <p className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
              Payment received. It can take a minute for seats to update below.
            </p>
          )}
          {checkoutResult === "cancelled" && (
            <p className="text-[11px] text-white/50 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              Checkout cancelled -- no charge was made.
            </p>
          )}

          {loading && <p className="text-white/40 text-xs text-center py-6">Loading…</p>}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          {info && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1">
              <p className="text-sm font-semibold">{info.dealershipName}</p>
              {info.seatLimit === null ? (
                <p className="text-xs text-emerald-400">Unlimited seats</p>
              ) : (
                <>
                  <p className="text-xs text-white/60">
                    {info.approvedSeats} / {info.seatLimit} seats used
                  </p>
                  {info.subscriptionStatus && (
                    <p className="text-[11px] text-white/40">Subscription: {info.subscriptionStatus}</p>
                  )}
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs text-white/50 uppercase tracking-wide">Plans</p>
            {PLANS.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4">
                <div>
                  <p className="text-sm font-semibold">{p.seats} seats</p>
                  <p className="text-xs text-white/50">${p.priceUsd}/month</p>
                </div>
                <button
                  onClick={() => subscribe(p.id)}
                  disabled={checkoutLoading !== null}
                  className="bg-red-600 disabled:opacity-50 rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-1"
                >
                  {info?.seatLimit === p.seats && <Check size={12} />}
                  {checkoutLoading === p.id ? "Redirecting…" : "Subscribe"}
                </button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/30">
            Subscribing lets your dealership have up to that many approved salesperson accounts on
            DealerReels. New accounts still need admin approval, but approval is blocked once you hit
            your seat limit.
          </p>
        </div>
      </div>
    </div>
  );
}
