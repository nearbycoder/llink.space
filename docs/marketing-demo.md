# Homepage product walkthrough

The homepage uses a real screen recording of llink.space, captured on October 12, 2026 with a fictional Studio Field profile (`@studiofield`) in an isolated local database. The sample links and `studiofield.example` domain are demonstration fixtures, not live destinations. A cursor highlight was added to make interactions easier to follow. No customer account, email, or analytics data appears in the recording.

## Assets

- `public/demo/product-tour.mp4`: silent H.264 walkthrough, 1280 × 800, optimized for progressive playback.
- `public/demo/product-tour.vtt`: English captions.
- `public/demo/product-tour-poster.webp`: still from the recorded Design studio.
- `public/demo/profile-preview.webp`: refreshed October 12, 2026 for the paper, ink & signal redesign; real mobile screenshot of the fictional profile, captured by the recorder at 3× pixel density and encoded losslessly to keep borders and type clear.
- `src/components/marketing/demo-chapters.json`: chapter times and the written walkthrough.
- `src/components/marketing/features.ts`: the 20-feature marketing inventory.

## Updating the recording

Use a local instance and a fictional profile. Never record a customer account. Keep the demo’s public-domain fixture on the reserved `.example` domain and use `example.com` for sample destinations.

Record these flows with a desktop viewport of 1280 × 800:

1. Design studio: change the theme, undo, redo, and publish.
2. Links dashboard: search, sort, and open the link editor.
3. Public page: save a link, open the reading list, and expand an FAQ.
4. QR sharing: open the share kit and download an SVG.

Trim loading/setup frames, encode H.264 with `yuv420p` and `faststart`, and update the poster, caption timings, and chapter JSON together. Keep the mobile preview viewport at 390 × 790 with a device scale factor of 3 (1170 × 2370 output). Keep its frame, badge, and note unrotated to avoid diagonal edge artifacts on software-rendered Linux browsers. The player intentionally uses `preload="none"`, has no autoplay, and supports native controls, captions, chapter seeking, and a written alternative.

Validate the marketing browser tests, play the recording, inspect mobile/desktop layouts, and check that the copy still reflects the shipped app. Marketing changes must preserve custom-domain profile rendering at `/`.

The player streams the bundled MP4 through `/api/demo-video`, which supports byte ranges for Safari metadata requests and chapter seeking. No external video host is required.

## Repeatable capture

Start the app against a migrated, isolated local database, then run:

```sh
DEMO_BASE_URL=http://127.0.0.1:3000 \
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/llink_demo \
node scripts/record-marketing-demo.mjs
```

The recorder requires Chromium (`npx playwright install chromium`), `ffmpeg`, and `ffprobe`. It accepts only loopback app/database hosts. It creates a new fictional account with the `studiofield` handle, three links, an FAQ, and a reserved `studiofield.example` domain fixture directly in that local database, so use a database where that handle and domain are unused; it does not call a DNS or hosting provider. These fixtures remain in the disposable database. Raw clips and the sample SVG download stay in a temporary directory printed at completion.

The script captures the homepage phone image, trims setup/loading frames from four real browser recordings, joins them, and regenerates the MP4, poster, caption cues, chapter times, and content-hash version together. Review the finished recording before committing. The content hash versions all three media URLs so returning visitors fetch the updated assets together. The October 12 recording is 46.04 seconds, 1280 × 800 at 25 fps, approximately 2.0 MB, with no audio track.
