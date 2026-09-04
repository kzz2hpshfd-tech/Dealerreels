"use client";

import { useRef } from "react";

// thumbnailUrl is essentially never set today (nothing in the upload flow
// generates one), so this can't just rely on <video poster>. Seeking to a
// moment just past 0 forces the browser to decode and paint a real frame
// from the video itself without ever playing it -- the standard way to get
// a thumbnail out of a <video> element with no server-side poster.
export default function VideoThumb({
  videoUrl,
  thumbnailUrl,
  className,
}: {
  videoUrl: string;
  thumbnailUrl?: string | null;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      poster={thumbnailUrl ?? undefined}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={() => {
        const el = videoRef.current;
        if (el && !thumbnailUrl) el.currentTime = Math.min(0.1, el.duration || 0.1);
      }}
      className={className}
    />
  );
}
