# llink.space

`llink.space` is a link-in-bio platform for creators and brands.

It lets users:
- create a public page at `/u/$username`
- manage links from a dashboard
- choose from a built-in icon set for links
- upload a profile avatar (local object storage in dev)
- track click analytics per link

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
  - Profile editing (display name, bio, avatar upload)
  - Analytics (total clicks, active links, clicks by link, recent clicks)
- Onboarding flow for claiming unique usernames
- Mobile-friendly UI across landing, dashboard, and public pages

## Prerequisites

- [Bun](https://bun.sh/)
- PostgreSQL database

## Environment Variables

Create `.env.local` in project root:

```bash
# Required
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME

# Optional (PostHog)
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://us.i.posthog.com
VITE_POSTHOG_DEV_ENABLED=false

# Optional (object storage; defaults shown)
OBJECT_STORAGE_BACKEND=local
LOCAL_OBJECT_STORAGE_DIR=public/uploads
LOCAL_OBJECT_STORAGE_BASE_PATH=/uploads
```

Notes:
- `VITE_POSTHOG_HOST` must be an API host (for example `https://us.i.posthog.com`), not an assets CDN host.
- `OBJECT_STORAGE_BACKEND=s3` is scaffolded but not implemented yet in this codebase.

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

## Deployment Notes

- Build with `bun --bun run build`.
- Start with `bun --bun run start`.
- Ensure production env has:
  - `DATABASE_URL`
  - auth-related secrets/config required by your Better Auth setup
  - object storage config if you replace local storage
