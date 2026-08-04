"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/feed",
    });
  };

  return (
    <main className="flex h-screen w-full items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Dealerreels</h1>
          <p className="text-sm text-zinc-400">Sign in to your sales account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-white text-black font-semibold rounded-lg py-2 text-sm hover:bg-zinc-200 transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  );
}
