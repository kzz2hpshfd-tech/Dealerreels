"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const MODELS = ["Ram 1500", "Grand Cherokee", "Compass", "Durango", "Challenger", "Wrangler"];

export default function UploadPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [model, setModel] = useState(MODELS[0]);
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState("");
  const [newLeadCount, setNewLeadCount] = useState(0);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.push("/login");
  }, [sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/leads")
      .then((r) => r.json())
      .then((d) => setNewLeadCount((d.leads ?? []).filter((l: any) => l.status === "NEW").length))
      .catch(() => {});
  }, [sessionStatus]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Choose a video file first.");
    setError("");
    let uploadUrl = "";
    try {
      setStatus("uploading");

      let urlRes: Response;
      try {
        urlRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: file.type }),
        });
      } catch (err: any) {
        throw new Error(`Could not reach /api/upload (${err.message}).`);
      }
      if (!urlRes.ok) {
        const body = await urlRes.text().catch(() => "");
        throw new Error(`/api/upload returned ${urlRes.status}: ${body.slice(0, 200)}`);
      }
      const presign = await urlRes.json();
      uploadUrl = presign.uploadUrl;
      const publicUrl = presign.publicUrl;

      let putRes: Response;
      try {
        putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
      } catch (err: any) {
        const host = (() => { try { return new URL(uploadUrl).host; } catch { return "unknown host"; } })();
        throw new Error(`PUT to ${host} failed before a response came back (${err.message}). This usually means the storage bucket's CORS policy doesn't allow this origin.`);
      }
      if (!putRes.ok) {
        const body = await putRes.text().catch(() => "");
        throw new Error(`Storage rejected the upload (HTTP ${putRes.status}): ${body.slice(0, 300)}`);
      }

      setStatus("saving");
      let saveRes: Response;
      try {
        saveRes = await fetch("/api/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption,
            model,
            tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
            videoUrl: publicUrl,
          }),
        });
      } catch (err: any) {
        throw new Error(`Could not reach /api/videos (${err.message}).`);
      }
      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => ({}));
        throw new Error(`Could not save the video (HTTP ${saveRes.status}): ${body.error ?? "unknown error"}`);
      }
      router.push("/feed");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
      setStatus("idle");
    }
  }

  if (sessionStatus !== "authenticated") {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center text-sm text-white/50">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 flex justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl">Post a <span className="text-red-500">reel</span></h1>
          <Link href="/leads" className="text-xs text-white/50 underline flex items-center gap-1">
            My Leads
            {newLeadCount > 0 && (
              <span className="min-w-[15px] h-[15px] px-0.5 rounded-full bg-red-600 text-white text-[9px] leading-[15px] text-center no-underline">
                {newLeadCount}
              </span>
            )}
          </Link>
        </div>
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
