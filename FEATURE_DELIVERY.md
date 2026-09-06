# Creator expansion

Integration branch: `codex/creator-expansion`. Preserve the verified review fixes in a baseline commit, deliver each chunk as a tested commit, then merge into `main` only after the complete suite passes.

1. Publishing: featured link cards and publish/expiry schedules.
2. Design: live phone/desktop preview, theme presets/customization, content blocks, reusable page templates.
3. Insights: period comparisons and a safe link health checker.
4. Audience: consent-based signup, subscriber management/CSV, encrypted email-provider connection and explicit sync.
5. Domains: ownership verification, hosting connection/status, custom-domain public pages.

Provider work is implemented and tested with isolated contracts. Real subscriber sync and custom-domain provisioning require the creator's provider credentials/DNS changes; no subscriber emails or live domains are created during development.

Each chunk includes regression coverage. Final checks: unit tests, typecheck, source checks, clean migrations/schema drift, production build, complete Playwright journeys, desktop/mobile browser review. No deployment is implied by the local merge.
