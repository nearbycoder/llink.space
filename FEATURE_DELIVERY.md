# Creator expansion delivery

All ten ideas are implemented in five committed chunks on `codex/creator-expansion`, with a final integration hardening commit. The earlier project review fixes are preserved in their own baseline commit.

| Chunk | Completed features | Commit |
| --- | --- | --- |
| Publishing | Featured image/CTA cards; publish and expiry schedules | `f6d48fb` |
| Design | Live phone/desktop preview; themes and customization; content blocks; page templates | `50f2ac8` |
| Insights | Period comparisons; safe destination health checks | `afb5d60` |
| Audience | Consent-based signup and subscriber management; encrypted Brevo integration | `79f8f5f` |
| Domains | Ownership proof, Railway hosting connection/status and custom-domain public pages | `7e97f18` |

Final integration fixes make dashboard counts, filters and CSV exports schedule-aware; validate concurrent schedule edits against current data; persist ambiguous email sync attempts for opt-out retries; limit email sync concurrency; and require provider confirmation before deleting a domain mapping. CI now exercises migrations and isolated provider workflows.

## Final verification

- 100 unit tests across 22 files passed.
- All 11 Playwright journeys passed, including the existing creator journey and new publishing/design/analytics/health/audience/domain flows.
- TypeScript and Biome source checks passed.
- Production build passed; entry bundle is 323.70 kB before compression (100.14 kB gzip).
- A fresh local PostgreSQL database applied migrations `0000`–`0011`; Drizzle reported no schema changes afterward.
- Isolated provider/database tests passed: encrypted credentials, exclusive sync lease, opt-outs, ambiguous provider failures, retries, deletion, DNS ownership, hosting provisioning, TLS activation and confirmed removal.
- The built server passed upload, streamed image GET, ETag 304, HEAD, social preview and oversized chunked-request checks.
- Desktop and mobile views were reviewed. Design studio and five additional mobile routes had no horizontal overflow; the additional browser review reported no page errors.
- `git diff --check` passed.

## Release setup

No deployment is implied by the local merge. New feature migrations `0006`–`0011` must be applied before running this app in production; the earlier production migration work only covered `0004` and `0005`.

Provider tests replace HTTP and DNS and use isolated local databases. No real subscriber emails, provider contacts or live domains were created during development. Real use requires creator Brevo credentials and operator Railway hosting configuration plus DNS records. The app syncs contacts; campaigns and email unsubscribe links are managed in Brevo. See [README setup instructions](README.md#audience-and-email-setup).
