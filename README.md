![llink.space](./public/readme.png)

# llink.space

`llink.space` is a link-in-bio platform for creators and brands.

It lets users:
- create a public page at `/u/$username`
- manage links from a dashboard
- choose from a built-in icon set for links
- upload a profile avatar (local object storage in dev)
- track click analytics per link

## Latest Updates

- Server-rendered dashboard data flow for auth/profile/link state to reduce UI flashing on refresh.
- Added a static, hydration-safe dashboard link list fallback before drag-and-drop mounts.
- Public profile and missing-profile experiences are fully server-rendered, including a custom 404-style page for unknown usernames.
- Added customizable icon background colors for links.
- Introduced shared site branding (`SiteBrand`) with the chain-link message-bubble logo across key surfaces.
- Security hardening pass:
  - strict URL normalization/validation for user links (`http`/`https` only)
  - avatar validation blocks SVG and checks image magic bytes (JPG/PNG/WEBP/GIF)
  - origin checks for mutation endpoints (`/api/trpc/*`, `/api/auth/*`, `/api/upload/avatar`)
  - no-store caching on sensitive auth/API responses and dashboard routes
  - stronger root security headers (CSP in production, HSTS in production, COOP/CORP, nosniff, frame deny)
  - Better Auth trusted origins + production rate limiting/secure cookies

## Tech Stack

- TanStack Start + TanStack Router (SSR-enabled routes)
- React 19 + TypeScript
- tRPC + TanStack Query
- Better Auth (email/password)
- Drizzle ORM + PostgreSQL
- Tailwind CSS v4 + Radix UI
- Recharts (analytics charts)
- Optional PostHog client analytics

## Features

- Public profile pages at `/u/$username` (server rendered)
- Dashboard with:
  - Links management (create, edit, delete, reorder, active/hidden)
  - Link icon picker (30 built-in icons, including popular socials)
  - Per-link icon background color customization
  - Profile editing (display name, bio, avatar upload)
  - Analytics (total clicks, active links, clicks by link, recent clicks)
- Onboarding flow for claiming unique usernames
- Mobile-friendly UI across landing, dashboard, and public pages
- Custom not-found experience for missing public profiles

## Prerequisites

- [Bun](https://bun.sh/)
- PostgreSQL database

## Environment Variables

Create `.env.local` in project root:

```bash
# Required
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME

# Recommended for auth + origin checks
BETTER_AUTH_SECRET=your-long-random-secret
BETTER_AUTH_URL=http://localhost:3000

# Optional aliases used by origin resolution
APP_URL=http://localhost:3000
PUBLIC_URL=http://localhost:3000

# Optional extra trusted origins (comma-separated)
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000

# Optional (PostHog)
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://us.i.posthog.com
VITE_POSTHOG_DEV_ENABLED=false

# Optional (object storage; defaults shown)
OBJECT_STORAGE_BACKEND=local
LOCAL_OBJECT_STORAGE_DIR=public/uploads
LOCAL_OBJECT_STORAGE_BASE_PATH=/uploads

# Optional (S3-compatible object storage)
# Set OBJECT_STORAGE_BACKEND=s3 to enable this mode
S3_BUCKET=
# Alias also supported: S3_BUCKET_NAME
S3_REGION=us-east-1
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
# Alias also supported: AWS_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY=
# Alias also supported: AWS_SECRET_ACCESS_KEY
S3_PUBLIC_BASE_URL=
S3_FORCE_PATH_STYLE=true
S3_KEY_PREFIX=
```

Notes:
- `VITE_POSTHOG_HOST` must be an API host (for example `https://us.i.posthog.com`), not an assets CDN host.
- For AWS S3 you can usually omit `S3_ENDPOINT`; for S3-compatible providers (R2, MinIO, Railway bucket providers), set `S3_ENDPOINT`.
- `S3_PUBLIC_BASE_URL` is optional but recommended when your bucket uses a CDN/custom public domain.
- Railway bucket plugins commonly provide `S3_BUCKET_NAME`; this is supported directly by the app.
- In production, set `BETTER_AUTH_URL` to your canonical HTTPS domain and keep `BETTER_AUTH_SECRET` stable.

## Local Development

1. Install dependencies:

```bash
bun install
```

2. Apply database schema:

```bash
bun --bun run db:push
```

3. Start dev server:

```bash
bun --bun run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## How To Use

1. Open `/sign-up` and create an account.
2. Complete onboarding at `/onboarding`:
   - choose `username` (this becomes `/u/$username`)
   - set your display name
3. In `/dashboard`:
   - add/edit/reorder links
   - pick link icons from the built-in list
4. In `/dashboard/profile`:
   - update display name + bio
   - upload avatar (stored under `public/uploads` in local dev)
5. In `/dashboard/analytics`:
   - review click totals and link performance
6. Share your public page URL: `/u/$username`

## Routes Overview

- `/` landing page
- `/sign-up` register
- `/sign-in` login
- `/onboarding` claim username + create profile
- `/dashboard` links
- `/dashboard/profile` profile settings + avatar upload
- `/dashboard/analytics` analytics
- `/u/$username` public profile page (SSR)
- `/api/trpc/*` tRPC endpoint
- `/api/auth/*` Better Auth endpoint
- `/api/upload/avatar` avatar upload endpoint

## Scripts

```bash
# Dev
bun --bun run dev

# Build + preview
bun --bun run build
bun --bun run preview

# Run built server
bun --bun run start

# Tests
bun --bun run test

# Lint/format/check
bun --bun run lint
bun --bun run format
bun --bun run check

# Drizzle
bun --bun run db:generate
bun --bun run db:migrate
bun --bun run db:push
bun --bun run db:pull
bun --bun run db:studio
```

## Security Notes

- User-provided link URLs are normalized and restricted to `http`/`https`.
- Avatar uploads accept only JPG/PNG/WEBP/GIF, enforce size limits, and verify file signatures.
- Object storage supports local disk and S3-compatible buckets.
- Local uploads are in `public/uploads/`, which is git-ignored to prevent committing user files.
- State-changing API routes validate request origin.
- Auth and API mutation responses use `cache-control: no-store`.
- Root route sends security headers; production adds CSP + HSTS.

## Deployment Notes

- Build with `bun --bun run build`.
- Start with `bun --bun run start`.
- Ensure production env has:
  - `DATABASE_URL`
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL` (and optional `BETTER_AUTH_TRUSTED_ORIGINS` if needed)
  - object storage config if you replace local storage
