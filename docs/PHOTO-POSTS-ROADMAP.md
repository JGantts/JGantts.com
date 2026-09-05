# Photo-Centric Posts Roadmap

Last updated: 2026-09-05

## Objective

Make photographs the primary content of JGantts.com posts. The authoring flow
should begin with selecting and arranging photos, while titles and Markdown
remain optional supporting material. Originals stay under site ownership;
public pages deliver efficient renditions and Mastodon continues to receive a
teaser linking to the canonical post.

```text
Photo selection -> local originals -> image pipeline -> arranged post gallery
                         |                                  |
                         +-> backup                         +-> canonical page
                                                               |
                                                               +-> Mastodon link
```

## How to use this file

- Treat this as the implementation state for the photo workflow across sessions.
- Mark an item `[~]` while it is active and `[x]` only after implementation and
  relevant tests pass.
- Keep no more than one item active unless work is deliberately parallel.
- Update **Current state**, the date, and the decision log whenever progress is
  made.
- Add newly discovered work here rather than relying on chat history.

## Current state

- Status: Roadmap written; implementation has not started.
- Active item: None.
- Next item: 1.3 — enforce same-post hero ownership and fallback behavior.
- Already available: authenticated single-image upload after a draft exists;
  JPEG, PNG, WebP, and AVIF validation; required alt text; immutable local
  originals; 1,600 px and 480 px WebP derivatives; checksums; dimensions;
  database fields for display order, focal point, and hero media; public media
  URLs; backup of database and media.
- Current gaps: no batch or pre-draft upload, reorder, hero selection, metadata
  editing, captions, deletion, upload progress, responsive `srcset`, lightbox,
  focal-point controls, or explicit EXIF/GPS policy.

## Fixed architecture decisions

1. Photos belong to a local post and use immutable local media IDs. File paths
   never become API identifiers.
2. The database owns photo metadata and order; the filesystem owns bytes. Both
   move together through backup and restore.
3. Uploading and publishing are separate. Incomplete uploads must never publish
   a post, and publishing must verify every referenced rendition exists.
4. The first photo is the default hero, but the author may select another hero
   without changing gallery order.
5. Alt text describes the image for accessibility. A separate optional caption
   provides visible editorial context; filenames are neither.
6. Stored display order is explicit and contiguous. Clients never infer it from
   filenames, upload completion order, or creation timestamps.
7. Canonical pages use responsive local renditions. Full originals are not used
   as normal page assets.
8. Mastodon receives a teaser and canonical link, not a second authoritative
   copy of the gallery.
9. The initial system remains SQLite plus local persistent media on the single
   Linode. Object storage is deferred until operational evidence requires it.
10. Every destructive media action is explicit, authenticated, and safe around
    published posts and backups.

## Target media model

Each photo should ultimately contain:

- Immutable media ID and owning post ID.
- Private storage path for the uploaded source and public rendition paths.
- Original MIME type, normalized orientation, pixel dimensions, byte size, and
  SHA-256 checksum.
- Required alt text and optional visible caption.
- Explicit display order and optional focal point.
- Created and updated timestamps.
- Processing state and safe failure detail for recoverable pipeline errors.
- Rendition manifest including format, width, height, byte size, and URL.

The post retains an optional `hero_media_id` that must reference media owned by
that post.

## Implementation checklist

### Phase 1 — Media lifecycle and API

- [x] **1.1** Decide whether uploaded originals remain publicly downloadable or
  become private archival sources with a metadata-stripped high-resolution
  public rendition. Document the EXIF/GPS privacy behavior before accepting new
  production photos.
- [x] **1.2** Add an additive migration for caption, processing state/error,
  updated timestamp, and a normalized rendition manifest. Preserve all current
  media records and URLs.
- [ ] **1.3** Enforce that `hero_media_id` belongs to the same post and define
  deterministic fallback behavior when no hero is selected.
- [ ] **1.4** Add authenticated endpoints to edit alt text and caption, select the
  focal point, select the hero, and reorder all photos transactionally.
- [ ] **1.5** Add authenticated media deletion with published-post safeguards,
  hero fallback, database/file consistency, and idempotent retry behavior.
- [ ] **1.6** Add a batch-upload API contract with per-file results so one bad
  image does not discard successful uploads. Set explicit limits for file count
  and aggregate request size.
- [ ] **1.7** Return normalized media consistently from admin, public-post, feed,
  sitemap/metadata, and server-rendered page paths.
- [ ] **1.8** Test authorization, validation, cross-post references, concurrent
  reorder attempts, partial batch failure, deletion, and old-record migration.

Exit condition: the server supports the complete photo lifecycle without direct
SQL or filesystem work by the client.

### Phase 2 — Image processing pipeline

- [ ] **2.1** Normalize EXIF orientation before recording width and height; add
  portrait, landscape, square, and rotated-fixture tests.
- [ ] **2.2** Generate a responsive width set appropriate for thumbnails, index
  cards, mobile detail, desktop detail, and high-density screens without
  upscaling.
- [ ] **2.3** Produce WebP and AVIF where worthwhile, retain a broadly compatible
  fallback, and record every rendition in the database manifest.
- [ ] **2.4** Preserve intended color appearance with an explicit ICC/color-space
  policy while stripping private metadata from public renditions.
- [ ] **2.5** Generate a tiny placeholder or equivalent low-quality preview to
  prevent blank layout during large-image loading.
- [ ] **2.6** Make processing failure-safe: write temporary files, verify output,
  atomically promote the set, and clean up partial files without deleting a
  previously valid image.
- [ ] **2.7** Add a repeatable command to regenerate derivatives from stored
  sources after pipeline changes, with dry-run and bounded-concurrency options.
- [ ] **2.8** Add corruption, unsupported color/profile, decompression-bomb,
  disk-full, restart, and regeneration tests.

Exit condition: every accepted source image has a verified, privacy-conscious,
responsive rendition set that can be regenerated deterministically.

### Phase 3 — Photo-first authoring

- [ ] **3.1** Change the editor's new-post flow to create an empty draft first,
  then make drag-and-drop or file selection the primary action.
- [ ] **3.2** Support multi-file selection with individual progress, preview,
  cancellation, failure, and retry states.
- [ ] **3.3** Present every uploaded photo as an editable card with thumbnail,
  required alt text, optional caption, dimensions, and processing status.
- [ ] **3.4** Add keyboard-accessible drag reorder plus explicit move controls for
  touch and assistive technology; save one complete ordered list.
- [ ] **3.5** Add hero-photo selection and a focal-point picker with an immediate
  preview of index and social-preview crops.
- [ ] **3.6** Add confirmed photo removal and clear warnings when changing a
  published post.
- [ ] **3.7** Allow a photo-only post: title, excerpt, content warning, and Markdown
  body remain optional, while at least one successfully processed photo is
  required for the photo-post publishing path.
- [ ] **3.8** Add dirty-state protection, save/retry feedback, mobile layout, and
  recovery after refresh using the persistent admin session.
- [ ] **3.9** Add component/end-to-end coverage for batch upload, editing, reorder,
  hero selection, removal, reload recovery, and publish validation.

Exit condition: a complete multi-photo post can be authored comfortably from
desktop or mobile without leaving the private editor.

### Phase 4 — Canonical gallery experience

- [ ] **4.1** Design the canonical post around the hero and gallery, with text as
  supporting content and intentional treatment of mixed aspect ratios.
- [ ] **4.2** Render semantic `<figure>`/`<figcaption>` markup, accurate dimensions,
  responsive `<picture>` sources, and useful `sizes` values.
- [ ] **4.3** Load the hero eagerly with high priority; lazy-load later photos and
  reserve their exact aspect-ratio space to avoid layout shift.
- [ ] **4.4** Add an accessible full-screen viewer with keyboard navigation,
  visible focus, close behavior, swipe support, captions, and reduced-motion
  handling. The page must remain fully usable without it.
- [ ] **4.5** Apply focal points only to cropped contexts such as index cards and
  social previews; show the full composition in the canonical gallery.
- [ ] **4.6** Upgrade the posts index to a photo-led layout using the selected hero
  and stable aspect ratios without creating an excessive initial download.
- [ ] **4.7** Ensure no-JavaScript HTML contains the photo gallery, captions, alt
  text, and stable links to public renditions.
- [ ] **4.8** Verify accessibility, responsive behavior, touch targets, image
  loading, layout shift, and keyboard operation across representative galleries.

Exit condition: canonical posts feel purpose-built for photography and remain
fast, accessible, crawlable, and useful without JavaScript.

### Phase 5 — Metadata, sharing, and syndication

- [ ] **5.1** Use the selected hero consistently for Open Graph, Twitter Card,
  JSON-LD, Atom, and index previews, with absolute canonical URLs.
- [ ] **5.2** Add a dedicated social-card crop or rendition if real-world link
  previews crop ordinary gallery images poorly.
- [ ] **5.3** Keep Mastodon publishing link-first and verify that the canonical
  hero preview appears from page metadata without uploading authoritative media
  to Mastodon.
- [ ] **5.4** Define the behavior when a published hero is removed or replaced;
  local metadata updates immediately and Mastodon teaser edits remain explicit.
- [ ] **5.5** Validate previews with major crawlers and verify that captions and
  private image metadata do not leak into syndication payloads.

Exit condition: every external representation points back to the canonical
photo post and uses the intended hero safely.

### Phase 6 — Operations and launch

- [ ] **6.1** Extend health checks with media-processing failures, orphan database
  records, missing rendition files, and free-space thresholds.
- [ ] **6.2** Add structured events and metrics for uploads, processing duration,
  failures, regeneration, deletions, and bytes stored without logging image
  contents or credentials.
- [ ] **6.3** Confirm pre-deploy backups include private sources and every
  rendition; perform a restore rehearsal with a multi-photo production-shaped
  post.
- [ ] **6.4** Add an orphan audit/repair command that defaults to report-only and
  never deletes files automatically.
- [ ] **6.5** Measure storage growth and set documented capacity alerts and an
  off-host backup policy before defining any retention cleanup.
- [ ] **6.6** Run complete server/client tests, local production smoke, and live
  verification covering upload, publish, gallery, metadata, Mastodon link,
  backup, and restore.

Exit condition: photo publishing is observable, backed up, reversible, and
verified against the live domain.

## Explicitly deferred

- RAW-file development and editing.
- Video and audio galleries.
- Client-side filters or destructive image editing.
- Public user uploads or collaborative author accounts.
- Face recognition, automatic tagging, or machine-generated alt text.
- Object storage/CDN migration until local capacity, availability, or traffic
  measurements justify the operational cost.
- Copying full-resolution authoritative galleries to Mastodon.

## Decision log

### 2026-09-05 — Initial photo roadmap

- Chose to evolve the existing media foundation rather than introduce a second
  photo subsystem.
- Prioritized lifecycle operations and authoring ergonomics because upload and
  rendering already work at a basic level, but authors cannot yet arrange or
  maintain a gallery.
- Kept local persistent storage for the initial release and made EXIF/GPS privacy
  the first explicit decision before new production photo ingestion.
- Separated required accessibility alt text from optional visible captions and
  separated gallery order from hero selection.

### 2026-09-05 — Source-photo privacy policy

- Existing public original URLs remain available so already-published immutable
  links do not break.
- After the high-resolution public rendition is implemented and verified, new
  uploads will keep their source bytes private. Normal pages, sharing metadata,
  and downloads will use orientation-normalized, metadata-stripped renditions.
- Existing sources will move behind the private boundary only through an
  audited regeneration/migration that first proves every replacement rendition.

### 2026-09-05 — Photo-media lifecycle migration

- Added an additive version-four migration for captions, processing state and
  safe failure detail, rendition manifests, and update timestamps.
- Existing media migrates as ready, keeps its current paths, and receives its
  creation time as the initial update time. New uploads populate the lifecycle
  fields without exposing processing errors or internal manifests publicly.
- Verified a version-one database/media upgrade, fresh uploads, all 51 server
  tests, type checking, and the production server build.

## Definition of done

This roadmap is complete when:

- An author can create, arrange, describe, preview, publish, edit, and remove a
  multi-photo post entirely through the private editor.
- Canonical pages deliver responsive, accessible galleries with intentional
  hero selection and no dependency on Mastodon.
- Stored sources and public renditions follow a documented privacy policy and
  can be regenerated, backed up, and restored.
- Social metadata and Mastodon link posts consistently point to the canonical
  photo experience.
- Production health, capacity, backup, restore, and rollback behavior have been
  verified with real photo-shaped data.
