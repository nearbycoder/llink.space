# Twenty additional features and shared styling

This batch extends the existing toolkit with twenty additional features. Existing public routes, link IDs, authentication, ownership, and database schema remain compatible. It introduces no dependencies or migrations.

| # | Feature | Where to use it |
|---|---|---|
| 1 | Duplicate selected links as paused drafts | Links → Select → Batch tools |
| 2 | Apply or clear publishing schedules across selected links | Batch tools → Schedule links |
| 3 | Set or clear multiple descriptions | Batch tools → Edit descriptions |
| 4 | Apply an icon and background color across selected links | Batch tools → Style link icons |
| 5 | Literal title find and replace | Batch tools → Find & replace titles |
| 6 | Literal destination find and replace | Batch tools → Find & replace URLs |
| 7 | Remove tracking parameters from selected destinations | Batch tools → Remove tracking parameters |
| 8 | Save a dashboard sort as public order within sections | Links → Sort → Save as page order |
| 9 | Import browser bookmark HTML | Links → Import links |
| 10 | Import JSON link catalogs with descriptions and icons | Links → Import links |
| 11 | Export a JSON link catalog | Links → More link tools |
| 12 | Native audio player block | Design studio → Add content block → Audio |
| 13 | Call-to-action button block | Design studio → Add content block → Button |
| 14 | Optional labeled divider block | Design studio → Add content block → Divider |
| 15 | Plain code snippet with copy action | Design studio → Add content block → Code |
| 16 | Interactive visitor checklist | Design studio → Add content block → Checklist |
| 17 | Business hours with an explicit time zone | Design studio → Add content block → Hours |
| 18 | Estimated device breakdown with CSV export | Analytics → Clicks by device |
| 19 | UTC weekday/hour click heatmap with CSV export | Analytics → When people click |
| 20 | Website badge HTML preview, copy, and download | Profile → Website badge |

Batch tools preview the captured selection before applying changes. The server independently validates every selected row, checks ownership and update timestamps, and commits one transaction. One stale, missing, foreign, or invalid row rejects the entire batch. Tools accept up to 50 links; unchanged rows are skipped. Duplicate drafts retain their section and card details, append after existing links, and start paused, without schedules or featured status. Schedule activation is explicit; unchecked activation preserves each link's current active flag. Empty dates clear the respective schedule. Editing destinations clears cached health results.

Catalog imports accept a version-1 object (`{"version":1,"links":[...]}`) or a plain array. Each entry needs a title and safe HTTP(S) URL; descriptions, built-in icon keys, and hexadecimal icon colors are optional. All entries are validated before insertion, normalized duplicate URLs are skipped, and concurrent imports serialize per profile. Imports contain at most 50 links and 256 KB; split larger exported catalogs before importing. Imported links start as paused drafts in Unsectioned. Exported section names are annotations; section assignments, schedules, featured status, click history, and private IDs are not imported. Bookmark folders are likewise not recreated. An invalid replacement file clears the previous preview.

The six block types use the existing JSON content-block field and style-backup format. Audio requires a direct supported audio-file URL (use HTTPS for published pages), loads without preloading or autoplay, and offers a direct-file link. Code is escaped text and is never executed. Checklist progress lasts for the current visit. Business hours accept unique weekdays, 24-hour start/end times or Closed, and a valid IANA time zone; overnight ranges must be split across days. Button blocks open safe destinations directly. Analytics continues to describe managed-link clicks, rather than audio plays or block-button clicks. Device categories are estimates from existing browser information; all 168 UTC heatmap buckets are represented, including zero counts.

## Styling and reference review

Shared semantic colors now cover navigation, controls, forms, dialogs, status colors, and dashboard cards. Forest primary actions, restrained selected fills, consistent page widths, aligned action groups, quiet borders, and clearer type hierarchy connect the surfaces. Mobile inputs retain 16 px text, touch controls receive appropriate target sizes, and dialogs scroll within the viewport. Creator-selected public themes and icon colors are preserved.

The orchestrator used Mobbin MCP and relayed the [Braintrust playground reference](https://mobbin.com/screens/b6ba8022-ce35-4276-9539-c4a59bb0507c). This session read its returned metadata and visually inspected its screen image. The review informed navigation selection, hierarchy, alignment, and toolbar grouping; mobile layouts keep stacked cards. Mobbin tools were not directly callable in this session.

New SSR controls wait until React is ready to handle their first interaction. Batch, saved-order, and badge dialogs restore focus to their opening control on dismissal. Delayed-script browser validation covers the badge, exports, selection entry point, and checklist without timed sleeps.

## Verification and review

Validation uses disposable databases on local PostgreSQL port 55432, isolated from configured application data. The provider workflow suite uses mocked HTTP/DNS against a separate local review database. The collaborative preview host became unavailable after initial navigation; browser validation continued with the project's Playwright suite and cached Chromium, following the explicit fallback instruction. The matching browser download timed out; a temporary external configuration selects the cached executable without changing project dependencies or browser configuration.

| Gate | Final result |
|---|---|
| Unit tests | 163 passed across 47 files |
| Browser journeys | 83 passed, 0 failed, 0 not run; Chromium project, 3 workers, same final candidate |
| TypeScript | Passed |
| Source check | Passed; 12 warnings and 4 informational diagnostics remain |
| Production build | Passed |
| Existing migrations on fresh isolated databases | Passed; schema unchanged by this batch |
| Mocked provider/database workflows | Passed |
| Local production CSP/audio browser check | Passed; HTTPS audio plays only after requested, with actual response CSP |
| Diff whitespace and compatibility review | Passed; no dependency, migration, or route-tree changes |
| Desktop/mobile visual review | Inspected batch dialogs, badge dialog, public blocks, and analytics screenshots |

Production media support adds only `media-src 'self' https:` to the existing CSP. Existing script, connection, frame, and other policies remain intact. A local production build served on loopback port 3180 was checked with an isolated HTTPS audio fixture and mocked remote media; external analytics/font requests were blocked during that test. The temporary production test server was stopped afterward. The review server on port 3080 remains available.

Earlier attempts are separate from the final pass: the initial browser launch did not run tests because the matching browser was unavailable; later runs caught first-click hydration, missing focus restoration, outdated labels/count expectations, and heatmap layout problems, which were corrected. A delayed-script test initially mishandled interception cleanup; it now waits for handlers to drain. One full run received SIGTERM after reporting 61 successful cases and was not counted as a suite pass; its tool handle was terminal before replacement work started. The final complete 83-case run passed. An initial production playback test used the HTTP-only local fixture and was blocked by the intended HTTPS media policy; the corrected isolated HTTPS fixture passed without broadening that policy.

Screenshots and the production playback trace are preserved at `/home/nearby/.t3/scratch/2026-10-03-you-are-going-to-be-bcecbacc/llink-expansion-evidence`. This also retains the earlier production failure context and gate accounting. Earlier development attempts had no retry trace enabled; their known failures are documented rather than represented as passing runs.

Remaining release prerequisite: review and the normal release workflow. The review branch for this batch is `codex/feature-expansion-2026-10`. No PR, merge, or deployment is part of this handoff. No new environment variable, dependency, or migration is required by this batch.

Local review: [dashboard](http://100.69.136.40:3080/dashboard), [public fixture](http://100.69.136.40:3080/u/studiomuruoht0). The local fixture account is `studiomuruoht0@example.test`, password `ExpansionPreview123!`; it belongs only to the disposable database. Loopback access is available at `http://127.0.0.1:3080`. No production release or infrastructure changes were performed. The review server must remain running for these URLs to work.
