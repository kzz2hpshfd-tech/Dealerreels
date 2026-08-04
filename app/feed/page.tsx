import FeedClient from "@/components/FeedClient";

export default function FeedPage() {
  return (
    <main className="flex h-screen w-full flex-col items-center justify-center bg-black text-white">
      <div className="w-full max-w-md h-full relative border-x border-gray-800">
        {/* Your mobile-first video feed wrapper */}
        <FeedClient />
      </div>
    </main>
  );
}