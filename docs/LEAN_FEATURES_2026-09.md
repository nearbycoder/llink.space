# Twenty focused improvements

Each feature ships in its own PR with CI checks before merge. No new dependencies, services, database migrations, or top-level navigation. Existing dialogs and contextual controls contain the additions.

| # | Feature | Location | PR |
|---|---|---|---|
| 1 | Preview and import CSV link files | Import links | [#28](https://github.com/nearbycoder/llink.space/pull/28) |
| 2 | Import Markdown link lists | Import links | [#29](https://github.com/nearbycoder/llink.space/pull/29) |
| 3 | Save a link and immediately add another | Add link | [#30](https://github.com/nearbycoder/llink.space/pull/30) |
| 4 | Live link-card preview | Link editor, collapsed | [#31](https://github.com/nearbycoder/llink.space/pull/31) |
| 5 | Remove tracking parameters with a preview | Link editor | [#32](https://github.com/nearbycoder/llink.space/pull/32) |
| 6 | Warn about duplicate destinations before saving | Link editor | [#33](https://github.com/nearbycoder/llink.space/pull/33) |
| 7 | Quick publishing/expiry presets | Publishing options | [#34](https://github.com/nearbycoder/llink.space/pull/34) |
| 8 | Export just filtered links | Catalog export | [#35](https://github.com/nearbycoder/llink.space/pull/35) |
| 9 | Copy selected links as a formatted Markdown list | Selection tools | [#36](https://github.com/nearbycoder/llink.space/pull/36) |
| 10 | Search words across fields and exact phrases | Existing catalog search | [#37](https://github.com/nearbycoder/llink.space/pull/37) |
| 11 | Update an existing saved filter view | Saved views | [#38](https://github.com/nearbycoder/llink.space/pull/38) |
| 12 | Download visitor reading lists | Saved links dialog | [#39](https://github.com/nearbycoder/llink.space/pull/39) |
| 13 | Undo reading-list removal or clearing | Saved links dialog | [#40](https://github.com/nearbycoder/llink.space/pull/40) |
| 14 | Search within saved links | Saved links dialog | [#41](https://github.com/nearbycoder/llink.space/pull/41) |
| 15 | Filter health results by status and text | Link health | [#42](https://github.com/nearbycoder/llink.space/pull/42) |
| 16 | Export link-health results | Link health | [#43](https://github.com/nearbycoder/llink.space/pull/43) |
| 17 | Select oldest/stale links for rechecking | Link health | [#44](https://github.com/nearbycoder/llink.space/pull/44) |
| 18 | Search subscribers across all pages | Audience | [#45](https://github.com/nearbycoder/llink.space/pull/45) |
| 19 | Filter subscribers by subscription status | Audience | [#46](https://github.com/nearbycoder/llink.space/pull/46) |
| 20 | Review sessions and sign out other devices | Profile/security | [#47](https://github.com/nearbycoder/llink.space/pull/47) |

Verification includes parser and boundary unit tests, browser flows for every feature, downloaded-file and clipboard inspection, subscriber ownership checks, and two-session revocation. The existing creator journey, security, and provider workflow suites continue to run for each PR.

A separate [CI resilience fix (#48)](https://github.com/nearbycoder/llink.space/pull/48) adds a fail-closed OSV fallback only when npm’s advisory endpoint is unavailable. This is a build-time check, not an application dependency or service.
