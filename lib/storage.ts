import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

function getS3Client() {
  const required = ["S3_REGION", "S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  const accessKeyId = process.env.S3_ACCESS_KEY_ID!.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY!.trim();

  // R2 access key IDs are always 32 characters; a mismatch here means
  // the value stored in the deployment's env vars is truncated or
  // otherwise wrong, and R2 will reject every request with a 400 that
  // (being an error response) carries no CORS headers -- which then
  // shows up in the browser as an opaque, misleading CORS failure.
  // Surfacing the real cause here, before ever calling R2, saves a
  // round trip through that misleading error.
  if (accessKeyId.length !== 32) {
    throw new Error(
      `S3_ACCESS_KEY_ID is ${accessKeyId.length} characters long (R2 access key IDs are always 32). ` +
        `Currently starts with "${accessKeyId.slice(0, 4)}" and ends with "${accessKeyId.slice(-4)}". ` +
        `The value saved in Vercel's environment variables is wrong -- re-copy it from Cloudflare and update it there.`
    );
  }

  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    // R2 doesn't support the flexible-checksum params the SDK adds by
    // default, and it signs them against an empty body (no file exists
    // yet when the URL is presigned) -- the real upload's bytes then
    // never match what was signed, and R2's rejection carries no CORS
    // headers, so the browser hides it behind a generic network error.
    requestChecksumCalculation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function createUploadUrl(contentType: string) {
  if (!process.env.S3_PUBLIC_BASE_URL) {
    throw new Error("Missing environment variable: S3_PUBLIC_BASE_URL");
  }

  const s3 = getS3Client();

  const key = `videos/${randomUUID()}.mp4`;
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
  // Strip any trailing slash on the base URL so this never produces a
  // double slash regardless of whether S3_PUBLIC_BASE_URL was set with
  // one -- a double slash here 404s against R2's public dev URL since
  // the resulting path doesn't match the stored object key.
  const publicBase = process.env.S3_PUBLIC_BASE_URL!.replace(/\/+$/, "");
  const publicUrl = `${publicBase}/${key}`;

  return { uploadUrl, publicUrl, key };
}

// The R2 object key is always "videos/<uuid>.mp4" -- pull that back out
// of a previously-stored public URL regardless of what base URL it was
// built with (including a wrong/misconfigured one).
export function extractR2Key(url: string): string | null {
  const match = url.match(/videos\/[^/?]+\.mp4/);
  return match ? match[0] : null;
}

// Generates a time-limited signed GET URL straight from R2's S3 API
// using the same credentials the upload flow already uses. This avoids
// depending on the bucket's public "Development URL" being enabled and
// correctly configured in S3_PUBLIC_BASE_URL -- which has proven to be
// an easy thing to get wrong (e.g. pointing at a different bucket).
export async function getPlaybackUrl(key: string) {
  const s3 = getS3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: 60 * 60 * 6 });
}
