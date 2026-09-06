# Project review — September 6, 2026

Reviewed the app's routes, authentication flow, link and section management, analytics, profile editor, public pages, image upload/storage, social preview routes, database schema/migrations, and build/test configuration. Existing uncommitted work was retained and extended; this report describes the additional work from this review. This is a code and local runtime review, not a production load test or an exhaustive security audit.

## Performance fixes

| Area | Finding and change | Evidence |
| --- | --- | --- |
| Initial JavaScript | The root provider imported PostHog and its React integration even without an analytics key. Load the SDK dynamically only when configured and enabled. | Main production bundle: **543.05 → 321.15 KB**, gzip **172.94 → 99.49 KB**. About 41% smaller uncompressed and 42% smaller compressed; these are bundle measurements, not measured page-load speed. |
| Analytics | Ten sequential data queries, including six repeated aggregate scans. Combine the counts into one query and execute the five independent data queries together. | API tests verify totals, direct clicks, domain grouping, and all 30 daily buckets. The separate profile lookup remains. |
| Database lookups | No indexes supported common link/section profile filters, event profile/date ranges, or foreign-key lookups. | Five indexes added in migration `0004_query_indexes.sql`; clean-database migrations pass and schema generation reports no drift. |
| Reordering | One update per link and section caused round trips proportional to list size. | Parameterized bulk SQL updates inside a transaction; link updates use chunks of 1,000. API tests cover section movement, ordering, and duplicate-layout rejection. |
| Link creation | Fetched every link to compute the next sort position. | Database `MAX(sort_order)` scoped to the target section replaces full-row transfer. |
| Dashboard fetching | Every edit invalidated the list and immediately fetched it a second time. | Removed the duplicate refresh; SSR-loaded links, profile summary, and analytics stay fresh for 30 seconds. Mutations still invalidate affected data. |
| Charts | Rendered every ranked link and animated all chart transitions. | Display the top 20 links; the CSV retains all ranked links. Disable chart animation and return only the 12 recent events displayed. |

## Features and usability

- **Bulk paste import:** one URL per line, with optional tab-separated title. Preview valid entries, identify invalid lines, and skip existing/repeated URLs. Import up to 50 links as paused drafts into Unsectioned in one insert. A profile row lock prevents duplicate concurrent imports. No page scraping or third-party requests are needed.
- **Reproducible analytics:** selected 7/30/90-day range survives refresh and can be bookmarked. Server-generated UTC day buckets include zero-click days. CSV adds range boundaries, selected-period totals, and daily data. A refresh action and query-error message support retrying without losing the last available data.
- **Mobile link cards:** keep titles and URLs readable by putting actions below the details, with larger touch targets. Desktop layout remains compact.
- **Interaction readiness:** dashboard toolbar waits for hydration, fixing a lost Import click immediately after refresh.
- **CSV safety:** prefix formula-like text cells before spreadsheet export, while retaining quoting for commas, quotes, and newlines.
- **Session cleanup:** clear dashboard query data after successful sign-out.
- **Accessibility details:** label section-title inputs, announce share feedback, keep shared profile URLs canonical, specify small avatar dimensions, and limit link-card transitions to transforms.
- **CI:** added a named typecheck script and required typechecking, source checks, and production build alongside unit tests.

## Verification

- Baseline: 44 unit tests and TypeScript check passed.
- After resolving follow-up findings: **79 unit tests**, **6 Playwright end-to-end/API tests**, TypeScript, Biome source checks, production build, and `git diff --check` passed. Schema generation reports no drift and local migrations rerun successfully.
- Browser journey covers signup, onboarding, sections, link creation/editing/duplication, bulk visibility/move/delete, export, profile/avatar/background updates, public sharing and clicks, analytics ranges, password change, sign-out/sign-in, import validation, duplicate detection, persistence, and a 390px mobile layout.
- Additional API coverage includes all-or-nothing import validation, concurrent import deduplication, anonymous import rejection, hidden drafts on public pages, ignored clicks on paused links, and domain-based referrer aggregation.
- Migration `0004` was applied only to a fresh, isolated local PostgreSQL database. At the end of the initial review, the deployment database had not been modified; see the production follow-up below.
- Follow-up coverage verifies concurrent duplicate clicks and rate budgets, ignored crawler clicks, unsaved profile/password navigation and sign-out cancellation, streaming image GET/HEAD/304 responses, cache-validator precedence, invalid image signatures, and oversized chunked uploads without Content-Length.
- A test-owned HTTP redirect endpoint received zero requests when configured as an external avatar for a social preview. No internal or third-party endpoints were probed.
- A separate smoke test against the built Node server passed image upload, image GET, ETag 304, HEAD, social preview generation, and chunked-upload 413. Its test session was explicitly forwarded over loopback HTTP because production cookies are Secure; application cookie settings were unchanged.
- PostHog with a real project key, live S3 storage, production traffic, and non-Chromium browsers were not exercised. S3 streaming, cancellation, conditional headers, HEAD, and 304 metadata were verified using mocked SDK responses.

## Follow-up findings — resolved

| Finding | Applied fix |
| --- | --- |
| Arbitrary avatar/legacy icon URLs reached the server image renderer. | Resolve only upload keys from configured storage; validate raster MIME/signature, cap each image at 5 MiB, and impose a five-second read timeout. Render validated bytes as data URIs. External URLs use initials in social previews, while public browser profiles retain their existing image behavior. |
| Public click events had no throttle or deduplication. | Shared PostgreSQL counters allow 60 attempts per client IP/profile/minute; suppress matching link/client/user-agent/referrer duplicates within five seconds and ignore known crawler user agents. Atomic upserts work across app instances; indexed expiry cleanup uses bounded batches. IPs are HMAC-hashed. Proxy trust and the anonymous fallback are documented in README. Counts remain clicks, not unique visitors; clients sharing an IP share a budget. |
| Chunked uploads could reach multipart parsing before size validation. | Read at most 5 MiB plus 64 KiB of multipart overhead, then parse; cancel oversized input and return 413. Preserve the separate 5 MiB file limit, MIME allowlist, and magic-byte checks. |
| Private storage reads buffered the image and lacked conditional responses. | Stream local/S3 bodies directly through the proxy. Forward conditional headers and cancellation signals; support HEAD and 304, retaining cache metadata. Local ETags derive from file size and modification time. |
| Profile/password edits could be lost on navigation. | Confirm before route changes, tab reload/close, and sign-out when forms are dirty or saving/uploading. Cancelled sign-out preserves the authenticated session. |

Media testing also exposed Nitro's development asset fallback skipping API image requests. An explicit `/api/**` handler forwards requests to TanStack Start, including image Accept/Sec-Fetch-Dest requests. Both development and built-server checks pass.

## Rollout

Run `bun run db:migrate` against each deployment database before rolling out the built app. Migration `0004` adds query indexes; `0005_analytics_guards` adds the click protection table and expiry index without modifying user records. Both migrations are now applied to the verified Railway production database (see below). Application code remains local and has not been deployed.


## Production migration follow-up — September 6, 2026

Applied `0004_query_indexes` to the Railway **llink.space / production / Postgres** database at the user's request. Verified that the application's database connection matches this Postgres service.

The existing database had no Drizzle migration journal. Before recording a baseline for migrations `0000`–`0003`, compared all eight public tables (72 columns), column types/nullability/defaults, primary/unique/foreign-key constraints, and existing indexes against the locally migrated reference database. The schemas matched. PostgreSQL-version differences in how NOT NULL constraints appear in the catalog were normalized; column nullability was still compared directly.

Recorded the verified baseline and applied the five new indexes in a single transaction with a five-second lock timeout and a thirty-second statement timeout. Confirmed all five indexes are valid and ready, and profile/link/section/click counts are unchanged. A subsequent `bun run db:migrate` completed successfully with no pending migrations. The production homepage and sign-in page both returned HTTP 200. Verification completed at **2026-09-06 21:46 UTC**.

This follow-up applied the database migration only; it did not publish the local application changes.

### Click protection migration follow-up

Applied `0005_analytics_guards` to the same verified Railway production database at **2026-09-06 22:07 UTC**. Before applying it, verified the application/database connection match, all five existing migration hashes/timestamps, and absence of the new table. The migration added only the guard table and its index, with five-second lock and thirty-second statement timeouts. Confirmed the primary and expiry indexes are valid/ready, migration history contains all six entries, and a second migration run has nothing pending. Production homepage and sign-in checks returned HTTP 200 afterward. Application changes have not been deployed.
