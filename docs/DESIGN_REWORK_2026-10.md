# October UI rework: paper, ink & signal

The marketing site, dashboard, auth, onboarding, public profile pages, share dialogs, social preview images, icons and product media were redesigned around one system. It replaces the September sage-green refresh.

## System

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#F5F3EE` | App and marketing canvas |
| Ink | `#16140F` | Text, primary buttons, selected navigation |
| Signal | `#FF5F1F` | Brand accent, primary calls to action, highlights |
| Signal strong | `#C2410C` | Accent text and focus rings (meets contrast on paper and white) |
| Signal soft | `#FFE6DA` | Tinted backgrounds for selection and status |

- Type: **Fraunces** (display and page titles, optical sizing auto), **Geist** (interface and body), **Geist Mono** (URLs, counts, labels). Loaded from Google Fonts; OFL TTFs for social images live in `public/fonts/og`.
- Brand: the "ll·" mark (`BrandMark` in `src/components/SiteBrand.tsx`) — two paper strokes and a signal dot on an ink tile. Favicons and app icons are rendered from `public/favicon.svg`.
- Shared surfaces: `.surface`, `.surface-raised`, `.surface-sunken`, `.eyebrow` and `PageHeader` (`src/components/dashboard/PageHeader.tsx`). Buttons are pill-shaped; `variant="brand"` is the signal call to action.

## Surfaces

- **Marketing**: editorial hero with a real phone capture, marquee, three-job bento, dark tour section, numbered 40-feature index with filters, steps, FAQ and a signal closing band.
- **Dashboard**: grouped sidebar (Build / Grow / Maintain) with search, a page card linking to the public page, consistent page headers, a segmented link status strip, compact link rows, a single-hue analytics system (ink bars, signal top link, signal heatmap ramp) and visible selected states in pickers.
- **Auth and onboarding**: shared split layout (`src/components/AuthFrame.tsx`).
- **Public pages**: refreshed default "Signal" theme and backgrounds (theme and background IDs are unchanged, so no migration is needed), larger link cards, `@handle` under the name, theme-aware share, QR, print and contact controls, and a redesigned missing-profile page. Creator colors still come from the profile theme.
- **Social images**: `/api/og` and `/api/og/u/$username` render with bundled fonts. Profile images follow the creator's theme and accent and show up to four live links plus a count of the rest.

## Verification

Typecheck, Biome, 163 unit tests, the full Playwright suite and a production build pass. Desktop and 390 px mobile layouts were reviewed for the marketing page, dashboard pages, auth, public profile and missing profile; OG images were rendered from the production server. The tour, poster, captions and phone image were re-recorded with `scripts/record-marketing-demo.mjs`.

## Dark mode

Marketing, auth, onboarding, the dashboard and the 404/missing-profile pages support Light, Dark and System themes (`src/lib/theme.ts`). The choice is stored in the browser, synced across tabs, and applied by a small inline script before first paint, so there is no flash on load. Toggles live in the marketing nav and footer, the dashboard sidebar and the mobile menu.

Dark tokens are scoped to `.dark:not(:has([data-public-profile]))`, so creator pages always keep the creator's own theme. Components should use tokens (`bg-card`, `text-foreground`, `border-border`, …) rather than hex values; marketing uses its `--m-*` variables, which have dark values too. Charts read `--chart-bar`, `--border` and `--muted-foreground`.
