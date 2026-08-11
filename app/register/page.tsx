"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Dealership = { id: string; name: string };

export default function RegisterPage() {
  const router = useRouter();
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dealershipId, setDealershipId] = useState("");
  const [addingNewDealership, setAddingNewDealership] = useState(false);
  const [newDealershipName, setNewDealershipName] = useState("");
  const [newDealershipCity, setNewDealershipCity] = useState("");
  const [newDealershipState, setNewDealershipState] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          dealershipId: addingNewDealership ? undefined : dealershipId,
          newDealership: addingNewDealership
            ? { name: newDealershipName, city: newDealershipCity, state: newDealershipState }
            : undefined,
        }),
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
          <p className="text-sm text-zinc-400">Create your sales account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
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
