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

The creator expansion adds ten features, delivered in five chunks:

| Chunk | Features | Where |
| --- | --- | --- |
| Publishing | Featured image/CTA cards; publish and expiry scheduling | Links → Add/Edit |
| Design | Live phone/desktop preview; theme, font, accent and button controls; heading/text/image/video/contact blocks; four page templates | Design studio |
| Insights | Current versus previous period comparisons; destination health checks | Analytics / Link health |
| Audience | Consent-based signup and subscriber management; encrypted Brevo connection and explicit sync | Audience |
| Domains | Verified custom domains with Railway DNS/certificate status | Domains |

Schedules use the editor's local time and are stored as UTC timestamps. Public pages and click recording apply the same time window. Dashboard filters and CSV exports distinguish live, paused, scheduled and expired links. Only one link can be featured per profile.

Design changes stay in a draft until **Publish design**. Preview uses the public page renderer and does not record clicks. Templates replace draft styling and content blocks after confirmation; existing links remain. Video blocks accept YouTube or Vimeo URLs; images require alt text. Up to 30 blocks and 50 link edits can be published together.

Link health checks are manual, limited to ten selected links per batch and one batch per 30 seconds. The server uses timed HEAD requests, checks redirect destinations, and blocks private/reserved networks. Restricted or unreachable results are advisory; they do not hide links. Editing a destination clears its previous result.

- Paste up to 50 URLs with optional spreadsheet titles via **Import links**. Preview validation and duplicates before saving drafts, then publish with bulk actions.
- Analytics ranges are bookmarkable (`/dashboard/analytics?days=30`). Charts and CSV exports share UTC day boundaries and include days with zero clicks.
- CSV exports neutralize formula-like user text. Mobile link actions sit below the title for readable cards and larger touch targets.
- Optional PostHog loads only when configured, after hydration. Analytics uses fewer queries, link reordering uses bulk SQL updates, and indexed profile/date lookups support growing click histories.
- Public click tracking now filters known crawlers, suppresses rapid duplicates, and applies a shared database rate limit. Profile settings warn before leaving with unsaved changes.
- Uploads enforce a byte limit before multipart parsing. Storage responses stream with ETag/date validation and HEAD support; social previews use validated uploaded images.
- New installations and existing deployments should run `bun run db:migrate` before starting the updated app. `0004_query_indexes.sql` adds query indexes; `0005_analytics_guards.sql` adds the shared click protection table. The creator expansion adds migrations `0006`–`0011` for publishing, design, health, subscribers, custom domains and sync retries. All migrations are represented in the Drizzle schema.
- See [project review](PROJECT_REVIEW.md) for measurements, verification, and resolved findings.

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

# Optional for a trusted reverse proxy outside Railway; see Analytics below
# ANALYTICS_TRUSTED_IP_HEADER=x-real-ip

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
# Optional: override proxy path used when S3_PUBLIC_BASE_URL is not set
OBJECT_STORAGE_PROXY_BASE_PATH=/api/storage
```

Notes:
- `VITE_POSTHOG_HOST` must be an API host (for example `https://us.i.posthog.com`), not an assets CDN host.
- For AWS S3 you can usually omit `S3_ENDPOINT`; for S3-compatible providers (R2, MinIO, Railway bucket providers), set `S3_ENDPOINT`.
- `S3_PUBLIC_BASE_URL` is optional. If omitted, uploaded assets are served through the app at `/api/storage/*`, which works with private buckets.
- Railway bucket plugins commonly provide `S3_BUCKET_NAME`; this is supported directly by the app.
- In production, set `BETTER_AUTH_URL` to your canonical HTTPS domain and keep `BETTER_AUTH_SECRET` stable.

### Analytics protection

Click tracking allows 60 attempts per client IP and profile per minute. A repeated click with the same link, client, user agent, and referrer within five seconds is ignored. Duplicates consume the attempt budget; known crawler user agents are ignored before database queries. These are abuse controls, and counts still represent clicks rather than unique visitors. Shared networks can reach the same budget.

On Railway, the app uses the platform's [`X-Real-IP` header](https://docs.railway.com/networking/public-networking/specs-and-limits). Elsewhere, set `ANALYTICS_TRUSTED_IP_HEADER` only when your reverse proxy overwrites that header and clients cannot bypass the proxy. Missing or invalid trusted IPs share an anonymous budget per profile. Client IPs are HMAC-hashed with `BETTER_AUTH_SECRET`; raw IPs are not stored. Expiring budgets live in `analytics_guards` and are cleaned in bounded batches during click traffic.

## Local Development

1. Install dependencies:

```bash
bun install
```

2. Apply database schema:

```bash
bun --bun run db:migrate
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
- `/dashboard/design` draft editor and live preview
- `/dashboard/health` destination checks
- `/dashboard/audience` signup settings, subscribers and Brevo
- `/dashboard/domains` domain verification and hosting status
- `/dashboard/analytics` analytics
- `/u/$username` public profile page (SSR)
- `/api/trpc/*` tRPC endpoint
- `/api/auth/*` Better Auth endpoint
- `/api/upload/avatar` avatar upload endpoint
- `/api/storage/*` object proxy endpoint for local files/private S3 reads

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
bun run typecheck
bun run check src
bun run test:e2e
# Requires an isolated local *_test or *_review database:
bun run test:providers

# Lint/format/check
bun --bun run lint
bun --bun run format
bun --bun run check

# Drizzle
bun --bun run db:generate
bun --bun run db:migrate
bun --bun run db:push
bun --bun run db:seed
bun --bun run db:pull
bun --bun run db:studio
```

## Security Notes

- User-provided link URLs are normalized and restricted to `http`/`https`.
- Avatar/background uploads accept only JPG/PNG/WEBP/GIF, enforce a 5 MiB file limit, and verify file signatures. The entire request is limited to 5 MiB plus 64 KiB for multipart overhead, including requests without Content-Length, before multipart parsing.
- Social previews load only validated upload keys from configured storage, with a five-second timeout and 5 MiB image limit. External image URLs fall back to initials in previews; they may still appear on the public profile in the browser.
- Object storage supports local disk and S3-compatible buckets.
- The storage proxy streams GET responses and supports HEAD, If-None-Match, and If-Modified-Since. Explicit Nitro API routing keeps image requests from falling through to Vite's asset middleware in development.
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

### Audience and email setup

Enable the signup block in **Audience**. Signups record consent text/time, normalize and deduplicate email addresses, and support immediate undo. The list holds up to 10,000 records, with paginated management and formula-safe CSV export. Signups require consent but do not verify ownership of the email address.

Connect a Brevo API key and numeric list ID in the dashboard. Credentials are encrypted with AES-256-GCM using a key derived from `BETTER_AUTH_SECRET`; use a random secret of at least 32 characters and keep it stable. After rotating the secret, reconnect each provider account.

**Sync next 20** explicitly processes up to 20 pending additions/removals with at most three concurrent requests. A database lease prevents overlapping syncs. Failed or ambiguous attempts remain retryable, and opt-outs are saved even during provider outages. Removing a contact that may have been synced first removes its membership from the connected list. Disconnecting does not delete existing Brevo contacts. Reconnecting queues active subscribers for another sync.

The app syncs contacts, not campaigns, and does not send welcome or marketing emails. Send campaigns and manage email unsubscribe links in Brevo. Sync preserves provider-side blacklist preferences. See Brevo's [contact creation](https://developers.brevo.com/reference/create-contact) and [list removal](https://developers.brevo.com/reference/remove-contact-from-list) APIs.

### Custom domain setup

The operator must configure the Railway service that runs this app:

```bash
CUSTOM_DOMAIN_RAILWAY_TOKEN=your-project-scoped-token
CUSTOM_DOMAIN_PROJECT_ID=your-project-id
CUSTOM_DOMAIN_ENVIRONMENT_ID=your-environment-id
CUSTOM_DOMAIN_SERVICE_ID=your-app-service-id
# Optional, only if routing requires an explicit port:
# CUSTOM_DOMAIN_TARGET_PORT=3000
```

The three IDs fall back to Railway's built-in `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID` and `RAILWAY_SERVICE_ID`. The token must be a project-scoped token sent as `Project-Access-Token`; it stays on the server. See [Railway API authentication](https://docs.railway.com/integrations/api) and [domain operations](https://docs.railway.com/integrations/api/manage-domains).

Each creator can add one domain. **Domains** supplies a unique `_llink` TXT record for ownership. After that record verifies, the app connects hosting and displays the provider's actual DNS records. Activation requires verified routing and an issued TLS certificate. Keep the ownership TXT record: requests recheck it after 24 hours. Without operator hosting configuration, ownership can verify but the domain stays offline.

The active hostname serves the public profile at `/`, and becomes its share/canonical URL. The existing `/u/username` route stays available. Removing a domain also removes its Railway mapping if this app created that mapping; mappings adopted from existing Railway configuration are left there. Provider removal must succeed before local removal completes.

### Verification and release

CI runs unit tests, typechecking, source checks, a production build, fresh SQL migrations, isolated provider/database workflows and Playwright journeys. Provider tests replace HTTP and DNS, require a local test database, and cannot send email or provision real domains.

Before releasing the expansion, apply migrations `0006`–`0011` with `bun run db:migrate`, then deploy the built app. Provider credentials and DNS configuration are separate setup steps. See [delivery record](FEATURE_DELIVERY.md) for the completed chunks and verification results.
