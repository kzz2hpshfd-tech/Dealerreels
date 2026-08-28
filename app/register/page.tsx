"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import TermsContent from "@/components/TermsContent";

type Dealership = { id: string; name: string };
type AccountType = "shopper" | "dealer";
type VehicleContext = {
  id: string;
  model: string;
  dealership: { name: string; city: string; state: string };
};

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  );
}

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // A dealership's embedded "Watch the Reel" badge links here with ?v=<id>
  // instead of straight to the feed, so a first-time visitor signs up
  // against the specific vehicle they clicked on rather than a generic form.
  const videoId = searchParams.get("v");
  const { status: sessionStatus } = useSession();

  const [accountType, setAccountType] = useState<AccountType>("shopper");
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [vehicle, setVehicle] = useState<VehicleContext | null>(null);
  const [vehicleLoadFailed, setVehicleLoadFailed] = useState(false);

  // Shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Shopper fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Dealer fields
  const [name, setName] = useState("");
  const [dealershipId, setDealershipId] = useState("");
  const [addingNewDealership, setAddingNewDealership] = useState(false);
  const [newDealershipName, setNewDealershipName] = useState("");
  const [newDealershipCity, setNewDealershipCity] = useState("");
  const [newDealershipState, setNewDealershipState] = useState("");

  useEffect(() => {
    fetch("/api/dealerships")
      .then((r) => r.json())
      .then((d) => setDealerships(d.dealerships ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!videoId) return;
    fetch(`/api/videos/${videoId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.video) setVehicle(d.video);
        else setVehicleLoadFailed(true);
      })
      .catch(() => setVehicleLoadFailed(true));
  }, [videoId]);

  const vehicleMode = !!videoId && !vehicleLoadFailed;

  useEffect(() => {
    // Someone who's already signed in shouldn't be asked to sign up again
    // just because they clicked a dealership's badge -- send them straight
    // to the vehicle.
    if (videoId && sessionStatus === "authenticated") {
      router.replace(`/feed?v=${videoId}`);
    }
  }, [videoId, sessionStatus, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload =
        accountType === "shopper" || vehicleMode
          ? { accountType: "shopper", firstName, lastName, phone, email, password, smsConsent }
          : {
              accountType,
              name,
              email,
              password,
              dealershipId: addingNewDealership ? undefined : dealershipId,
              newDealership: addingNewDealership
                ? { name: newDealershipName, city: newDealershipCity, state: newDealershipState }
                : undefined,
            };

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create your account.");
        setLoading(false);
        return;
      }

      const signInRes = await signIn("credentials", { email, password, redirect: false });
      if (signInRes?.error) {
        router.push(videoId ? `/login?callbackUrl=${encodeURIComponent(`/feed?v=${videoId}`)}` : "/login");
        return;
      }
      router.push(videoId ? `/feed?v=${videoId}` : "/feed");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-black text-white px-4 py-10">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
        {vehicleMode ? (
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Dealerreels</h1>
            {vehicle ? (
              <div className="flex items-center gap-3 bg-black border border-zinc-800 rounded-lg p-3 text-left">
                <div className="w-14 h-11 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13" />
                    <path d="M3 13h18v4a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4Z" />
                    <circle cx="7" cy="17.5" r="1.4" />
                    <circle cx="17" cy="17.5" r="1.4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{vehicle.model}</p>
                  <p className="text-xs text-zinc-400 truncate">
                    {vehicle.dealership.name} &middot; {vehicle.dealership.city}, {vehicle.dealership.state}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-[60px] rounded-lg bg-zinc-800 animate-pulse" />
            )}
            <div className="space-y-1">
              <p className="text-base font-semibold">Hi! You&rsquo;re interested in this vehicle.</p>
              <p className="text-sm text-zinc-400">
                Just need a couple quick things from you and we&rsquo;ll get you straight to the video.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Dealerreels</h1>
            <p className="text-sm text-zinc-400">Create your account</p>
          </div>
        )}

        {!vehicleMode && (
          <div className="grid grid-cols-2 gap-2 bg-black border border-zinc-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setAccountType("shopper")}
              className={`text-xs font-semibold rounded-md py-2 transition-colors ${
                accountType === "shopper" ? "bg-white text-black" : "text-zinc-400"
              }`}
            >
              I'm shopping for a car
            </button>
            <button
              type="button"
              onClick={() => setAccountType("dealer")}
              className={`text-xs font-semibold rounded-md py-2 transition-colors ${
                accountType === "dealer" ? "bg-white text-black" : "text-zinc-400"
              }`}
            >
              I work at a dealership
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {vehicleMode ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                  required
                />
                <p className="text-[11px] text-zinc-500">
                  Just in case you get logged out &mdash; we&rsquo;ll text you a link right back here.
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                  required
                />
                <p className="text-[11px] text-zinc-500">At least 8 characters.</p>
              </div>

              <label className="flex items-start gap-2 text-[11px] leading-snug text-zinc-400">
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={(e) => setSmsConsent(e.target.checked)}
                  className="mt-0.5 shrink-0"
                  required
                />
                <span>
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setShowTerms((s) => !s)}
                    className="underline text-zinc-300"
                  >
                    Terms &amp; Conditions
                  </button>
                  .
                </span>
              </label>

              {showTerms && (
                <div className="border border-zinc-800 rounded-lg p-3 max-h-64 overflow-y-auto bg-black">
                  <TermsContent headingClassName="text-xs font-semibold text-zinc-300" />
                </div>
              )}
            </>
          ) : accountType === "shopper" ? (
            <>
              <div className="flex gap-2">
                <div className="w-1/2 space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">First Name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                    required
                  />
                </div>
                <div className="w-1/2 space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">Last Name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                  required
                />
                <p className="text-[11px] text-zinc-500">At least 8 characters.</p>
              </div>

              <label className="flex items-start gap-2 text-[11px] leading-snug text-zinc-400">
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={(e) => setSmsConsent(e.target.checked)}
                  className="mt-0.5 shrink-0"
                  required
                />
                <span>
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setShowTerms((s) => !s)}
                    className="underline text-zinc-300"
                  >
                    Terms &amp; Conditions
                  </button>
                  .
                </span>
              </label>

              {showTerms && (
                <div className="border border-zinc-800 rounded-lg p-3 max-h-64 overflow-y-auto bg-black">
                  <TermsContent headingClassName="text-xs font-semibold text-zinc-300" />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Full Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                  required
                />
                <p className="text-[11px] text-zinc-500">At least 8 characters.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Dealership</label>
                {!addingNewDealership ? (
                  <>
                    <select
                      value={dealershipId}
                      onChange={(e) => setDealershipId(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                      required
                    >
                      <option value="" disabled>
                        Select your dealership
                      </option>
                      {dealerships.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setAddingNewDealership(true)}
                      className="text-xs text-zinc-400 underline"
                    >
                      My dealership isn't listed
                    </button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <input
                      placeholder="Dealership name"
                      value={newDealershipName}
                      onChange={(e) => setNewDealershipName(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                      required
                    />
                    <div className="flex gap-2">
                      <input
                        placeholder="City"
                        value={newDealershipCity}
                        onChange={(e) => setNewDealershipCity(e.target.value)}
                        className="w-1/2 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                        required
                      />
                      <input
                        placeholder="State"
                        value={newDealershipState}
                        onChange={(e) => setNewDealershipState(e.target.value)}
                        className="w-1/2 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddingNewDealership(false)}
                      className="text-xs text-zinc-400 underline"
                    >
                      Choose an existing dealership instead
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-semibold rounded-lg py-2 text-sm disabled:opacity-50 transition-colors ${
              vehicleMode ? "bg-red-600 text-white hover:bg-red-500" : "bg-white text-black hover:bg-zinc-200"
            }`}
          >
            {loading
              ? "Creating account…"
              : vehicleMode && vehicle
              ? `See the ${vehicle.model}`
              : "Create Account"}
          </button>
        </form>
        {vehicleMode && (
          <p className="text-center text-[11px] text-zinc-500">
            You&rsquo;ll land right back on this vehicle the moment you&rsquo;re signed up.
          </p>
        )}
        <p className="text-center text-xs text-zinc-500">
          Already have an account?{" "}
          <Link
            href={videoId ? `/login?callbackUrl=${encodeURIComponent(`/feed?v=${videoId}`)}` : "/login"}
            className="underline text-zinc-300"
          >
            Sign in
          </Link>{" "}
          instead.
        </p>
      </div>
    </main>
  );
}
