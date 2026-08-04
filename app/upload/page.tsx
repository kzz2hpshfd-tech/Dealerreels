"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const MODELS = ["Ram 1500", "Grand Cherokee", "Compass", "Durango", "Challenger", "Wrangler"];

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [model, setModel] = useState(MODELS[0]);
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Choose a video file first.");
    setError("");
    try {
      setStatus("uploading");
      const urlRes = await fetch("/api/videos/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
      });
if (!urlRes.ok) {
  const errData = await urlRes.json().catch(() => ({}));
  throw new Error(errData.error || "Could not get an upload URL.");
}
const { uploadUrl, publicUrl } = await urlRes.json();

      const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!putRes.ok) throw new Error("Video upload failed.");

      setStatus("saving");
      const saveRes = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, model, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), videoUrl: publicUrl }),
      });
      if (!saveRes.ok) throw new Error("Could not save the video.");
      router.push("/feed");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
      setStatus("idle");
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 flex justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-xl">Post a <span className="text-red-500">reel</span></h1>
        <div>
          <label className="text-xs text-white/50 uppercase tracking-wide">Video file</label>
          <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full mt-1 text-sm" required />
        </div>
        <div>
          <label className="text-xs text-white/50 uppercase tracking-wide">Model</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
            {MODELS.map((m) => (<option key={m} value={m}>{m}</option>))}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/50 uppercase tracking-wide">Caption</label>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="text-xs text-white/50 uppercase tracking-wide">Tags (comma separated)</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="towing, family, weekend" className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button type="submit" disabled={status !== "idle"} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors rounded-lg py-2 text-sm font-semibold">
          {status === "idle" && "Post reel"}
          {status === "uploading" && "Uploading video…"}
          {status === "saving" && "Publishing…"}
        </button>
      </form>
    </div>
  );
}
