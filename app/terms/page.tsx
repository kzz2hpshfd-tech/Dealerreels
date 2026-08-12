import Link from "next/link";
import TermsContent from "@/components/TermsContent";

export const metadata = { title: "Terms & Conditions | DealerReels" };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <Link href="/register" className="text-xs text-zinc-400 underline">
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-2">Terms &amp; Conditions</h1>
          <p className="text-xs text-zinc-500 mt-1">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
        <TermsContent />
      </div>
    </main>
  );
}
