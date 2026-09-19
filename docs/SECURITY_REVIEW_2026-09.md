# Security and dependency review — September 19, 2026

## Scope

Reviewed authentication/session configuration, request-origin checks, tRPC ownership and public output, uploads/storage/social images, link-check SSRF defenses, provider credential storage, subscriber/domain workflows, dependencies, and existing CI. Tests use isolated local accounts/databases and mocked provider/DNS responses. No production user data was changed during verification.

## Changes

- Updated direct production/development dependencies and their transitive trees. The initial Bun audit reported 20 advisories (1 critical, 8 high, 11 moderate); the final tree reports zero known advisories. Added `bun run audit` to CI so future pull requests are checked.
- Authentication trusts configured application origins, not arbitrary incoming Host values. Public custom-domain requests still work on their own origin. Sibling-site requests without explicit trusted Origin/Referer metadata are rejected.
- Authentication POST bodies are bounded at 64 KiB and tRPC POST bodies at 1 MiB, before framework JSON parsing. Actual streamed bytes are checked even without Content-Length; oversized streams are cancelled. Batches are capped at 10 procedures, and the client splits requests at the same limit.
- Public profile/link/section responses use explicit field lists. Account user IDs, internal timestamps, publishing schedules, and link-health diagnostic/redirect fields are no longer included. Dashboard data is unaffected.
- Unexpected tRPC errors return a generic message instead of database queries, parameters, or stack traces. Validation and expected authorization errors retain their useful messages.
- Image URL validation handles query strings, fragments, encoded SVG extensions, and local path escapes consistently.

## Dependency compatibility notes

All direct dependencies are on their latest available releases except `@vercel/og`, pinned to **0.11.1**. Its latest **1.0.2** release fails in Node's ESM runtime on import (`Dynamic require of "fs" is not supported` in its bundled HarfBuzz code). Its distribution also lacks `hb.wasm`. This was reproduced independently of the app and caused actual social-image endpoint failures in the browser suite. Retaining the working renderer avoids breaking shared page previews.

`sharp` is overridden to **^0.35.4** so the retained renderer still receives the patched image-processing libraries. `fflate` is overridden to **^0.8.3** to remove an upstream pinned vulnerable version. The existing `js-yaml` override now requires **^4.3.2**. Other existing overrides remain within their compatible major versions, with the lockfile refreshed to available patches. Nitro remains on the existing nightly channel, updated to the latest nightly available at review time.

The updated router regenerated its route manifest; the updated formatter required formatting changes in two existing test files. The mobile-header test now scopes its selector to app content because updated development tools add their own hidden header/navigation.

## Verification

- **133 unit tests and 50 Playwright browser/API tests passed**, together with typecheck, source formatting/lint, production build, and dependency audit.
- Built Node server smoke check passed secure/HttpOnly session issuance, authenticated dashboard rendering, profile/link edits, image upload/storage, public profile rendering, both social-image endpoints, production CSP, and hostile-origin rejection.
- New integration coverage: account-to-account link/section/design access, atomic mixed-owner bulk rejection, public-field privacy, forged Host/Origin, sibling-site and opaque origins, oversized declared/chunked requests, excessive batches, and internal-error redaction.
- Existing coverage: full creator journey, passwords/sessions, link import/edit/publishing, templates/design, analytics, upload signatures/streaming/cache validators, safe social previews, custom-domain ownership, subscriber workflows, all offline features, mobile menus/search, and marketing/demo playback.
- Isolated provider verification covers encrypted credentials, sync leases, opt-out/removal retries, DNS ownership, TLS activation, and confirmed removal. Provider calls are mocked; no live emails or domain provisioning occur.

This is a source/dependency review with automated regression checks, not a guarantee of absence of vulnerabilities. Live third-party credentials/services, production load, and non-Chromium browser engines were not exercised. Existing production CSP still permits inline scripts for the SSR framework; a nonce-based policy would require a separate integration change.
