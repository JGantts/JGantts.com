# Social Preview Collage Roadmap

Last updated: 2026-09-22

## Implementation status

The first production-capable slice is now implemented: deterministic layouts
and selection, content-addressed JPEG generation, durable database records,
immutable delivery, stale-state detection, publication gating, Open Graph and
Twitter metadata, syndication URL consistency, an exact admin preview with a
regeneration action, and a bounded-concurrency backfill command. Remaining work
is concentrated in visual fixture review, automatic draft-time regeneration,
failure-state polish, historical revision manifests, cleanup/drift tooling, and
the canary rollout.

## Objective

Automatically create an attractive social-preview collage from a post's ordered
photos. The result must be deterministic, immutable, fast for crawlers, visible
to the author before publication, and consistent across Open Graph and Twitter
card metadata.

> Generate once from published media, serve as an immutable asset, and never
> make a social crawler compose the preview.

## Current state

- `resolvePostPreview()` selects the explicit hero photo, falling back to the
  first photo, and exposes one existing rendition as the social image.
- The preview model already includes image URL, MIME type, width, and height in
  its deterministic preview token.
- Server-rendered post HTML emits Open Graph and Twitter card metadata before
  client-side JavaScript runs.
- Share URLs already carry a content-derived `preview` token, while canonical
  URLs and numeric publication revisions remain separate.
- Photos have stable IDs, author-controlled display order, focal points, source
  dimensions, checksums, and immutable responsive renditions.
- The server already uses Sharp and has staging, validation, cleanup, backup,
  and regeneration patterns for derived media.
- The admin editor can choose a hero photo. A one-photo post now treats its only
  photo as the effective hero.
- Post-level composite assets and exact social-card previews now exist; rollout
  and the remaining operational hardening are tracked below.

## Product decisions

1. Generate one primary 1.91:1 collage at 1,200 × 630 pixels.
2. Use at most five photos. More photos add visual noise at social-card sizes.
3. Select photos in this order:
   - explicit hero, or the sole photo;
   - remaining photos in author-controlled display order;
   - stop after five photos.
4. When a multi-photo post has no explicit hero, use its first ordered photo as
   the collage's lead photo without persisting an implicit hero selection.
5. Use each photo's focal point for `cover` cropping. Default to the center when
   no focal point is stored.
6. Do not add post title, location, date, logos, or other text to the image.
   Social clients already render title and description, and image-only output
   avoids clipping, localization, and accessibility duplication.
7. Use a small, fixed gutter and a neutral background sampled from the site's
   presentation palette. Do not add drop shadows or per-photo borders.
8. Produce a broadly compatible JPEG in sRGB with metadata stripped. Keep the
   generator capable of adding another output format later without changing the
   layout contract.
9. Keep the current hero rendition as a fallback whenever no collage exists or
   collage generation fails during the compatibility rollout.
10. Generate and validate the asset before publication completes. Never build a
    collage synchronously in response to a crawler request.

## Deterministic layouts

Use a 12-pixel gutter on a 1,200 × 630 canvas. Coordinates are part of the
layout schema and must be covered by snapshot tests.

| Photo count | Layout |
| ---: | --- |
| 1 | One full-bleed 1,200 × 630 crop |
| 2 | Two equal 594 × 630 columns |
| 3 | Lead photo 792 × 630 on the left; two 396 × 309 photos stacked on the right |
| 4 | A 2 × 2 grid of 594 × 309 photos |
| 5+ | Lead photo 720 × 630 on the left; four 228 × 309 photos in a 2 × 2 grid on the right |

The layout planner must return only geometry and source identity. Sharp-specific
decoding, cropping, and encoding belong in the generator so layout tests remain
fast and deterministic.

## Identity and immutability

Define a `SOCIAL_COLLAGE_SCHEMA_VERSION` independent from the media-pipeline
version and the Open Graph `PREVIEW_SCHEMA_VERSION`.

The collage fingerprint must include, in fixed order:

1. collage schema version;
2. canvas dimensions, gutter, and background color;
3. selected layout and ordered media IDs;
4. each selected photo's source checksum and orientation-normalized dimensions;
5. each selected photo's focal point;
6. the explicit hero media ID, when present;
7. output format and encoder settings.

Hash the canonical serialization with SHA-256 and use a collision-resistant
lowercase hexadecimal prefix. A suitable public URL is:

```text
/media/social/{post-id}/{collage-fingerprint}.jpg
```

The URL must be immutable and cacheable for a long duration. Reordering photos,
changing a focal point, changing the hero, regenerating a source rendition, or
changing the collage schema must produce a different fingerprint and URL.
Title and body edits must not regenerate the image.

The existing preview token will change automatically because its model contains
the resolved social-image URL and dimensions. Increment `PREVIEW_SCHEMA_VERSION`
when switching the resolver from the hero rendition to the collage so the
representation change is explicit even for edge cases that retain the same
image identity.

## Storage model

Add a migration-backed post-level social-preview record with, at minimum:

- post ID;
- collage fingerprint;
- ordered input-media identity;
- relative file path;
- MIME type;
- pixel width and height;
- byte size;
- collage schema version;
- generation timestamp;
- generation state and sanitized error, if generation is asynchronous;
- source publication revision when generated for a published post.

The database record is the lookup authority; the filesystem stores the derived
asset. Write through a staging file, decode the completed output to verify its
format and dimensions, atomically move it into place, and only then commit the
database record. Preserve the prior valid collage until the replacement is
fully committed.

Backups must include collage records and files. Restore verification must check
that every current record resolves to a readable asset. Orphan cleanup may
remove unreferenced collage files only after the normal backup-retention window.

## Generation lifecycle

### Drafts

- Upload, removal, reorder, hero selection, focal-point changes, and media
  pipeline regeneration mark the draft collage dirty.
- Do not regenerate on title, body, location, date, or time keystrokes.
- Generate on explicit author request at first, then consider a short,
  serialized debounce after photo mutations if generation is fast enough.
- The admin preview may temporarily show the last valid collage with a clear
  “preview out of date” state while replacement generation runs.

### Publication

- Publication must ensure that a current collage exists for the exact ordered
  photo inputs being published.
- Generate before the status transition is committed. A failed required
  generation leaves the post as a draft and returns an actionable admin error.
- Capture the collage identity in the published revision's media snapshot so
  publication history can explain which social image was used.
- A text-only post continues using the site's default social image.

### Published edits

- An explicit save may prepare a draft collage, but must not silently change the
  public social image before the next publication revision is committed.
- Publishing the edited post promotes the prepared collage and advances the
  normal revision and preview URL contracts.
- Existing syndicated links retain their captured share URL. Stale preview
  tokens follow the redirect behavior defined in `PREVIEW-URL-ROADMAP.md`.

## API and metadata contract

Extend the resolved preview model with enough information for all consumers to
use one server-owned decision:

```ts
type SocialImage = {
  alt: string
  height: number
  mimeType: 'image/jpeg'
  url: string
  width: number
}
```

- Use the collage as the first and primary `og:image` and `twitter:image`.
- Emit `og:image:secure_url`, `og:image:type`, `og:image:width`,
  `og:image:height`, and `og:image:alt` alongside it.
- Use a short composite alt value such as `Photo collage for {post title}`.
  Individual photo alt text remains attached to individual photos on the page;
  concatenating five descriptions into metadata would be excessively verbose.
- Continue emitting `summary_large_image` when a collage or hero fallback is
  available.
- Keep server-rendered tags authoritative. Client-side navigation may mirror
  them but must not be required by crawlers.
- Return collage identity and generation state through the authenticated admin
  API. Public APIs need only the resolved social-preview model and share URL.

Open Graph permits multiple `og:image` values and gives the first one preference.
The initial implementation should emit only the collage as the primary image;
individual-photo entries can be evaluated later with real client testing.

## Admin experience

- Add a “Social preview” section using the exact 1.91:1 generated asset, not a
  CSS approximation.
- Show which photos were included and the order in which they were used.
- Label the effective lead photo and indicate whether it is explicit or the
  ordered fallback.
- Show `Current`, `Generating…`, `Out of date`, and `Generation failed` states.
- Add a “Regenerate social preview” action for recovery and visual review.
- Keep “Publish” disabled while required generation is running.
- On failure, preserve the previous preview, show a concise error, and provide a
  retry without requiring photos to be uploaded again.
- Do not add freeform collage editing in the first version. Existing photo
  order, hero selection, and focal points are the authoring controls.

## Implementation roadmap

### Phase 1 — Lock the layout and identity contracts

- [x] **1.1** Add a pure layout planner for one through five selected photos.
- [x] **1.2** Add deterministic photo-selection logic for hero-first and display
  order, including one-photo posts and posts with more than five photos.
- [x] **1.3** Define `SOCIAL_COLLAGE_SCHEMA_VERSION`, canonical fingerprint
  serialization, and encoder settings.
- [ ] **1.4** Create visual fixtures covering square, portrait, landscape,
  panorama, mixed aspect ratios, missing focal points, and edge focal points.
- [ ] **1.5** Review the fixtures at actual card size on desktop and mobile and
  record any approved geometry changes before storage work begins.

Exit condition: the same ordered media inputs always produce the same layout
plan and fingerprint.

### Phase 2 — Build and verify the Sharp generator

- [ ] **2.1** Select the smallest local rendition that safely covers each tile,
  falling back to the normalized source when necessary.
- [x] **2.2** Convert focal points into bounded Sharp `extract` rectangles for
  each tile's aspect ratio.
- [x] **2.3** Composite every tile onto the fixed sRGB canvas with exact gutters.
- [x] **2.4** Encode a metadata-free JPEG and verify decoded format, dimensions,
  file size, and absence of private metadata.
- [ ] **2.5** Bound input pixel counts, output bytes, concurrency, and total
  generation time using the existing media-pipeline safety conventions.
- [ ] **2.6** Add pixel-level or perceptual fixture tests with an explicit
  tolerance and human-readable failure artifacts.

Exit condition: trusted local photo inputs produce a verified 1,200 × 630 asset
with stable pixels and bounded resource use.

### Phase 3 — Add durable storage and delivery

- [x] **3.1** Add the social-preview database migration and repository methods.
- [ ] **3.2** Add staging, atomic promotion, rollback, and orphan-cleanup logic.
- [x] **3.3** Serve fingerprinted collage URLs with immutable cache headers,
  correct content type and length, and safe path validation.
- [ ] **3.4** Include collage files in backup, restore, and drift checks.
- [ ] **3.5** Add repository and HTTP tests for missing files, stale records,
  traversal attempts, interrupted writes, and concurrent generation.

Exit condition: a collage survives restart, backup, and restore and is safely
served from an immutable URL.

### Phase 4 — Integrate lifecycle and revisions

- [x] **4.1** Centralize dirty-state calculation from ordered media, checksums,
  focal points, hero, and schema version.
- [ ] **4.2** Invalidate or prepare replacements after upload, remove, reorder,
  hero, focal-point, and media-regeneration operations.
- [x] **4.3** Serialize duplicate generation requests for the same fingerprint.
- [x] **4.4** Make publication verify or generate the exact current collage
  before committing the published status.
- [ ] **4.5** Add collage identity to published revision snapshots without
  exposing draft-only assets as historical public revisions.
- [ ] **4.6** Test rollback when generation or publication fails midway.

Exit condition: no published revision can point at a missing, stale, or
partially written required collage.

### Phase 5 — Switch preview resolution and metadata

- [x] **5.1** Resolve a current collage first, then the existing hero rendition,
  then the site default image.
- [x] **5.2** Add social-image alt text and emit all Open Graph structured image
  properties from the resolved model.
- [x] **5.3** Increment `PREVIEW_SCHEMA_VERSION` and update token tests.
- [ ] **5.4** Verify canonical URLs remain unchanged while share-preview URLs
  change exactly when the resolved collage changes.
- [x] **5.5** Verify Mastodon and Facebook syndication continue capturing the
  exact share URL at queue time.

Exit condition: server-rendered metadata consistently points to the immutable
collage and produces the expected preview-token change.

### Phase 6 — Add the exact admin preview

- [x] **6.1** Return collage status, URL, dimensions, selected media IDs, and
  schema version through the admin API.
- [x] **6.2** Replace the current approximate post-preview image grid with the
  exact generated social asset in a dedicated 1.91:1 card.
- [ ] **6.3** Add generating, dirty, failed, retry, and current states without
  blocking unrelated text editing or browser autosave.
- [x] **6.4** Confirm hero, order, and focal-point edits visibly affect the next
  generated preview.
- [ ] **6.5** Add component tests for one through five photos and generation
  state transitions.

Exit condition: the author sees the same pixels before publication that social
clients will request afterward.

### Phase 7 — Backfill, canary, and rollout

- [ ] **7.1** Add an idempotent CLI dry run reporting eligible posts, expected
  fingerprints, missing inputs, estimated output count, and disk use.
- [ ] **7.2** Backfill current published photo posts with bounded concurrency and
  resumable progress.
- [ ] **7.3** Deploy collage generation while metadata still uses the hero
  fallback; compare files and logs before switching resolution.
- [ ] **7.4** Enable collage metadata for one canary post and verify the exact
  fetched image, dimensions, redirects, and cache identity in Discord and
  Meta's current debugging tools.
- [ ] **7.5** Verify Mastodon, Facebook, Discord, Messages, and at least one
  generic Open Graph inspector with one-, two-, three-, four-, and five-photo
  posts.
- [ ] **7.6** Enable the resolver globally, monitor generation failures and media
  request errors, then remove the temporary compatibility flag.
- [ ] **7.7** Document regeneration, backfill, rollback, disk cleanup, and
  recovery procedures in `CONTENT-OPERATIONS.md`.

Exit condition: existing posts have valid collages, new posts generate them
automatically, and real social clients display the expected layouts.

## Test matrix

| Scenario | Expected result |
| --- | --- |
| No photos | Site default social image; no collage record |
| One photo, no explicit hero | Full-bleed sole photo |
| Two to five photos | Exact count-specific layout |
| Six or more photos | Lead plus first four remaining ordered photos |
| Explicit hero is not first | Hero leads; remaining photos retain relative order |
| Reorder excluded sixth photo | Fingerprint unchanged |
| Reorder included photo | Fingerprint and preview token change |
| Change included focal point | Crop, fingerprint, and preview token change |
| Change excluded photo metadata | Collage fingerprint unchanged |
| Regenerate included source | Fingerprint changes when source checksum changes |
| Title/body-only edit | Collage unchanged; preview token may change for text |
| Generator failure during draft preview | Prior valid preview remains; retry available |
| Generator failure during required publish | Publish fails atomically; draft remains editable |
| Concurrent identical requests | One generated file and one committed record |
| Restart or restore | Current collage record resolves to a verified file |

## Observability and operations

- Record structured events for requested, cache-hit, generated, failed,
  promoted, and cleaned collage operations.
- Include post ID, fingerprint prefix, schema version, selected photo count,
  elapsed time, output bytes, and sanitized failure class. Do not log captions,
  alt text, filesystem roots, cookies, or tokens.
- Add health detail for missing current collage files after the feature becomes
  required, without making optional draft generation a core outage.
- Track generation duration, failure rate, generated bytes, cache-hit rate, and
  orphan-cleanup counts.
- Alert on repeated publication-blocking failures or a current database record
  whose file is missing.

## Rollback

- Keep the existing hero-image resolver intact behind the collage preference so
  metadata can immediately fall back without changing canonical post URLs.
- Disabling collage resolution must not delete records or files.
- A bad layout release increments the collage schema; never overwrite assets at
  an existing fingerprinted URL.
- If the metadata switch is rolled back, increment `PREVIEW_SCHEMA_VERSION` as
  appropriate so generated share URLs accurately represent the restored model.
- Preserve already syndicated share URLs and normal stale-preview redirects.

## Completion criteria

- Every published photo post resolves to either a current verified collage or a
  documented fallback.
- One through five photos use deterministic, visually approved layouts.
- Hero, order, focal point, source identity, and collage-schema changes produce
  correct immutable asset identities.
- Server-rendered Open Graph and Twitter metadata use the same resolved image
  and include type, dimensions, secure URL, and alt text.
- The admin displays the exact generated social asset before publication.
- Publication cannot commit a missing or partial required collage.
- Backup, restore, cleanup, backfill, rollback, and production canary procedures
  are tested and documented.

## Standards references

- [The Open Graph protocol](https://ogp.me/) defines `og:image`, its structured
  type/width/height/alt properties, and first-image preference for arrays.
- `PREVIEW-URL-ROADMAP.md` remains authoritative for share-token identity,
  canonical URLs, redirect behavior, and external canary testing.
- `REVISIONS-ROADMAP.md` remains authoritative for published revision identity
  and media snapshots.
