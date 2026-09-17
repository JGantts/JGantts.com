# Frontend Image Delivery Roadmap

Last updated: 2026-09-17

## Objective

Match each photo download to its displayed size as closely as the existing
rendition set allows. Tiles should stay small, expanded photos should stay
sharp, and opening one photo should not download the rest of the gallery.

> Request enough pixels for the rendered image, then stop.

## Current state

- The server already generates 320, 480, 768, 1,024, 1,600, and 2,400 px
  renditions without enlarging the source.
- It exposes WebP, AVIF, JPEG/PNG fallback, dimensions, byte sizes, and immutable
  URLs through the public API.
- Local gallery photos now retain the rendition list and render through a shared
  responsive-photo component.
- Masonry tiles use their computed layout width with a 2× DPR ceiling. The
  lightbox uses its contained viewport width with a 2.5× ceiling.
- AVIF is omitted when its 768 px minimum would materially oversupply a small
  tile. WebP and JPEG/PNG fallback candidates remain available.
- Whole-post large-image preloading has been removed. Legacy attachments still
  use their existing preview and original URL pair.
- Chromium and WebKit request audits pass. Automated byte baselines and the
  Firefox audit remain; the local Playwright Firefox binary is not installed.

## Delivery rules

1. Preserve the full rendition list when adapting API media for the gallery.
2. Render local photos with `<picture>`, `srcset`, and an accurate `sizes` value.
3. Let the browser choose the smallest candidate that satisfies the rendered
   CSS width and the quality density for that context.
4. Start with a maximum effective DPR of 2 for masonry and 2.5 for the
   lightbox. Use DPR 1 when `Save-Data` is enabled. Tune these values only after
   comparing bytes and visible sharpness.
5. Prefer AVIF when its available candidates fit the target, then WebP, with
   JPEG or PNG as the fallback. Do not offer a 768 px AVIF to a tiny tile when a
   much smaller WebP is available.
6. Never use the original source for normal gallery or lightbox presentation.
7. Keep `thumbnail` and `large` only as fallbacks for legacy or malformed media
   records.
8. Do not add server-side crop variants. Existing client-side `object-fit`
   behavior remains unchanged.
9. Preload only an imminent lightbox image. After it is ready, optionally load
   the previous and next photos at low priority.
10. Use stable API URLs so the browser can reuse immutable cached responses.

## Implementation roadmap

### Phase 1 — Keep the responsive media data

- [x] Define a normalized gallery-photo type containing source dimensions, alt
  text, caption, placeholder, focal point, and the complete rendition list.
- [x] Stop reducing local media to `preview_url` and `url` in `IndexView.vue`.
- [x] Retain a simple adapter for legacy Mastodon attachments that only have
  preview and original URLs.
- [x] Validate and sort candidates by format and width, falling back safely when
  a rendition manifest is absent or malformed.
- [x] Unit-test DPR limits, `Save-Data`, small-tile AVIF suppression,
  transparency, malformed manifests, and revisioned URLs.

Exit condition: `ClusteredPhotoMasonry.vue` receives every usable rendition for
each local photo.

### Phase 2 — Add one responsive-photo component

- [x] Build a shared component that accepts the normalized photo, rendered
  width, display context, loading mode, and fetch priority.
- [x] Produce AVIF and WebP `<source>` elements plus JPEG/PNG fallback markup
  using width descriptors from the API.
- [x] Set `sizes` from the actual computed card or lightbox width rather than a
  broad viewport breakpoint.
- [x] Filter the candidate list to the context's DPR ceiling while retaining the
  first rendition large enough to meet the target.
- [x] Set intrinsic `width` and `height`, required alt text, and asynchronous
  decoding.
- [x] Test the selected candidates at DPR 1, 2, and 3, with and without
  `Save-Data`.

Exit condition: the same input dimensions always produce valid, efficient
responsive markup.

### Phase 3 — Use exact masonry dimensions

- [x] Pass each placed card's computed width into the responsive-photo
  component.
- [x] Update `sizes` when masonry geometry changes while keeping component keys
  stable so resize events do not cause unnecessary downloads.
- [ ] Keep offscreen tiles lazy. Load first-viewport tiles normally and give
  `fetchpriority="high"` only to the measured LCP photo.
- [x] Apply existing focal points through `object-position`; do not change the
  server rendition pipeline.
- [ ] Use the tiny placeholder only if testing shows it improves visible loading
  without creating wasteful requests for offscreen images.
- [ ] Test initial load, scrolling, resizing, orientation changes, and direct
  links to selected posts.

Exit condition: each masonry tile downloads a rendition appropriate to its
actual displayed width.

### Phase 4 — Bound lightbox loading

- [x] Calculate the displayed lightbox width from the viewport, photo aspect
  ratio, and existing dialog constraints.
- [x] Reuse the already-loaded tile while the expanded candidate downloads and
  swap only after the expanded image decodes.
- [x] Replace selected-post-wide preloading with active-photo loading followed
  by, at most, low-priority previous/next loading.
- [x] Skip adjacent preloads when `Save-Data` is enabled. No adjacent images are
  currently prefetched.
- [ ] Cancel stale decode work during rapid navigation and preserve the current
  image during viewport or orientation changes.
- [ ] Test first open, warm cache, slow network, rapid navigation, and posts with
  many photos.

Exit condition: the lightbox stays sharp without turning one click into a full
post download.

### Phase 5 — Measure and tune

- [ ] Capture image requests and transferred bytes before and after the change
  for mobile and desktop initial load, full gallery scroll, and first lightbox
  open.
- [ ] Compare each selected rendition width with the rendered width multiplied
  by the effective DPR.
- [ ] Target no more than 1.5× width oversupply for 95% of requests using the
  existing server widths, excluding source-limited images.
- [ ] Verify that selected and expanded photos are not visibly undersupplied,
  originals are never requested, and offscreen large images are not prefetched.
- [ ] Only consider adding a new server width when repeated measurements show a
  meaningful byte-saving gap in the existing ladder.
- [ ] Cover Chromium, Firefox, and WebKit with DPR 1, 2, and 3; normal and slow
  networks; warm and cold caches; transparency; and `Save-Data`.

Exit condition: the new implementation is measurably smaller than the fixed
480/1,600 px approach without visible softness or slower interaction.

## Definition of done

- Local photos use their responsive rendition manifests.
- Browser format and width selection reflects the real displayed size.
- Masonry tiles are not oversized downloads and high-density displays remain
  sharp within the declared DPR budget.
- The lightbox downloads only its active image and a bounded adjacent look-ahead.
- Originals are absent from normal presentation requests.
- Automated tests prevent a return to fixed-size URLs or eager large-image
  loading.
