# DealerReels

A TikTok-style short video feed for dealership salespeople to post vehicle
videos, followers to scroll/filter by dealership and model, and shoppers to
tap straight into a credit application.

## What's included

- **Next.js 14** app (TypeScript, App Router) — feed, upload, login pages
- **Prisma schema** — dealerships, users, videos, likes, follows, comments
- **NextAuth** — email/password login for salespeople
- **Direct-to-storage video upload** — presigned URLs (S3 or Cloudflare R2),
  so large video files never pass through our own server
- **Claude-powered vibe search** — `/api/vibe-search` re-ranks videos against
  a free-text mood/use-case query
- Red-and-black UI matching the prototype, with the "Apply for credit" button
  pulling each dealership's `creditApplyUrl` from the database

## What you need to provide before this runs

| Thing | Where to get it | Free tier? |
|---|---|---|
| PostgreSQL database | [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app) | Yes |
| Video storage | [Cloudflare R2](https://developers.cloudflare.com/r2/) (cheapest egress) or AWS S3 | R2 has a generous free tier |
| Anthropic API key | [console.anthropic.com](https://console.anthropic.com) | Pay-as-you-go |
| Hosting | [Vercel](https://vercel.com) (built for Next.js) | Yes, for small apps |

## Local setup

```bash
npm install
cp .env.example .env
# fill in .env with your real DATABASE_URL, S3 credentials, ANTHROPIC_API_KEY, etc.

npm run db:push      # creates tables from prisma/schema.prisma
npm run db:seed       # adds David Stanley Dodge + a sample salesperson/video
npm run dev            # http://localhost:3000
```

Seeded login: `elizabeth@example.com` / `changeme123` — **change this
password flow before going live**; the seed script is for local testing only.

## Deploying

1. Push this project to a GitHub repo.
2. Create a Postgres database (Neon is the fastest to set up) and copy its
   connection string into `DATABASE_URL`.
3. Create an R2 bucket (or S3 bucket), make it publicly readable for the
   `videos/` prefix (or put a CDN in front of it), and fill in the `S3_*`
   env vars. `S3_PUBLIC_BASE_URL` should be the public URL videos will be
   served from.
4. Import the repo into Vercel, add all the env vars from `.env.example`,
   and deploy. Run `npx prisma db push` once against the production database
   (Vercel's build step can do this automatically if you add
   `"postinstall": "prisma generate"` and a one-time `db push`/`migrate deploy`).
5. Point `NEXTAUTH_URL` at your production domain and generate a real
   `NEXTAUTH_SECRET` (`openssl rand -base64 32`).

## Known gaps to close before this is production-ready

- **Account creation flow** — right now users are only created via the seed
  script or directly in the database. You'll want a signup form (or an admin
  panel where a dealership manager adds their sales team).
- **Video processing** — raw MP4 upload works, but for real adaptive-quality
  streaming at scale, swap the storage layer for **Mux** or **Cloudflare
  Stream**, which handle transcoding, thumbnails, and HLS automatically.
- **Comments UI** — the `Comment` model and count exist; there's no comment
  thread UI yet.
- **Moderation** — nothing stops a bad upload from going live instantly.
  Consider a `PROCESSING` review step before `READY`.
- **Rate limiting** on `/api/vibe-search` — each call hits the Claude API;
  add caching or a debounce-aware rate limit before opening this up broadly.
- **Mobile app** — this is a responsive web app. Wrapping it as a native app
  (via Capacitor/Expo) is a separate project once the web version is solid.

## Project structure

```
app/
  (app)/feed/       the main scrolling feed
  (app)/upload/      post a new reel
  login/              sign in
  api/
    auth/             NextAuth
    videos/            list/create videos, per-video like, upload URL
    users/[id]/follow  follow/unfollow
    vibe-search/        Claude-powered ranking
    dealerships/         filter dropdown data
components/
  FeedClient.tsx      the TikTok-style scrolling UI
  Providers.tsx        NextAuth session provider
lib/
  db.ts                Prisma client
  auth.ts              NextAuth config
  storage.ts            S3/R2 presigned upload URLs
  vibeSearch.ts          Claude ranking call
prisma/
  schema.prisma         data model
  seed.ts                 sample data
```
