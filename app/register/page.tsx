"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TermsContent from "@/components/TermsContent";

type Dealership = { id: string; name: string };
type AccountType = "shopper" | "dealer";

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("shopper");
  const [dealerships, setDealerships] = useState<Dealership[]>([]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload =
        accountType === "shopper"
          ? { accountType, firstName, lastName, phone, email, password, smsConsent }
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
        router.push("/login");
        return;
      }
      router.push("/feed");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-black text-white px-4 py-10">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Dealerreels</h1>
          <p className="text-sm text-zinc-400">Create your account</p>
        </div>

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

        <form onSubmit={handleSubmit} className="space-y-4">
          {accountType === "shopper" ? (
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
                  </button>{" "}
                  and consent to be contacted by participating dealerships and DealerReels by phone
                  call and text message, including using automated dialing or texting technology, at
                  the phone number I provided above, even if it's on a Do Not Call list. Message and
                  data rates may apply. Consent is not a condition of purchase.
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
            className="w-full bg-white text-black font-semibold rounded-lg py-2 text-sm hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>
        <p className="text-center text-xs text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="underline text-zinc-300">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
