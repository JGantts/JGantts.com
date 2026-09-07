# Share Preview URL Roadmap

Last updated: 2026-09-07

## Objective

Give Discord, Facebook, Mastodon, and other unfurling clients a new share URL
when a post's rendered preview changes, without making a deployment or Git
commit part of the post's canonical identity.

This roadmap is subordinate to `REVISIONS-ROADMAP.md`. Numeric `rev` continues
to identify published content revisions. The new `preview` token identifies the
Open Graph representation of that published content.

## Current state

- Status: Implemented locally; external canary and production rollout remain.
- Active item: None.
- Next item: 5.1 — deploy and test a real Discord canary share.
- Implemented behavior: canonical post URLs remain tied to published content
  revisions, while generated share URLs receive a deterministic `preview`
  digest of the resolved Open Graph model.
- Migration constraint: existing clean, revisioned, build-tagged, and
  syndicated links must continue resolving without redirect loops.

## URL contract

For a post whose slug is `example`:

- Stable canonical, first published revision: `/photos/example`
- Stable canonical, later published revision: `/photos/example?rev=N`
- Share URL, first published revision:
  `/photos/example?preview=PREVIEW_HASH`
- Share URL, later published revision:
  `/photos/example?rev=N&preview=PREVIEW_HASH`

`rev` and `preview` have different meanings:

- `rev` is a monotonically increasing published-content revision stored in the
  database.
- `preview` is a deterministic digest of the Open Graph representation and is
  not stored as a new content revision.
- Git commit IDs, deployment IDs, hostnames, and server start times are not
  preview inputs.

The HTML `rel="canonical"` URL must omit `preview` and `build`. Search engines
therefore see only the stable clean or numeric-revision URL. Share controls,
syndication payloads, and UI links intended for copying may use the preview URL.

## Preview token model

Create one server-owned helper that calculates the complete preview model and
its token. The token input must include:

1. A manually maintained `PREVIEW_SCHEMA_VERSION` integer.
2. The resolved Open Graph title.
3. The resolved Open Graph description, including its exact line breaks.
4. The selected social image's public identity and rendition revision.
5. Any Open Graph fields whose change should cause an unfurl refresh, such as
   card type, image dimensions, or MIME type.

Serialize the model with fixed field order and UTF-8 encoding, hash it with
SHA-256, and expose a lowercase hexadecimal prefix of at least 12 characters.
The same published data and schema version must produce the same token on every
machine and deployment.

Do not calculate parallel tokens in Vue and Express. Express returns the share
URL or preview token through the public post API, and Vue renders that value.

## Code-change policy

Not every commit should change every post URL. A code change should produce a
new token only when it changes the representation an unfurling client receives.

- Increment `PREVIEW_SCHEMA_VERSION` when metadata selection, formatting,
  truncation, escaping, card type, or social-image rules change.
- Do not increment it for unrelated application code, styling, admin UI,
  database maintenance, or dependency updates that leave preview output
  unchanged.
- Add a pull-request checklist item for preview-affecting changes.
- Add a targeted CI guard if practical: changes to the preview-model modules
  must either increment the schema version or carry an explicit exemption.
- Include the schema version in tests so an intentional global preview refresh
  is visible in review.

## Request and redirect behavior

1. Clean canonical and current numeric-revision URLs return `200`; they do not
   redirect merely because `preview` is absent.
2. Generated share links contain the current preview token.
3. A request with the current token returns `200` and the matching Open Graph
   representation.
4. A stale or malformed `preview` token temporarily redirects (`302` or `307`)
   to the current share URL and sends `Cache-Control: no-store` on the redirect.
5. A stale numeric `rev` keeps the existing permanent `308` behavior and
   redirects to the current published revision plus its current preview token
   when the request is a share URL.
6. Prior slugs continue redirecting to the current slug without discarding the
   distinction between canonical and share URLs.
7. Unrelated query parameters must not affect the token or become part of the
   canonical URL.

The server-rendered Open Graph tags are authoritative. Client-side metadata is
kept consistent for navigation, but crawler correctness must not depend on
JavaScript execution.

## Open Graph and discovery policy

- `rel="canonical"`, JSON-LD `mainEntityOfPage`, Atom IDs, and sitemap locations
  use the stable canonical URL without `preview`.
- Generated copy/share links use the preview URL.
- Mastodon and Facebook syndication use the exact preview URL captured when the
  syndication operation is queued; later local changes do not silently mutate
  an already published remote post.
- Decide through canary testing whether `og:url` should use the preview URL or
  stable canonical URL. Prefer the preview URL only if a stable `og:url` causes
  Discord or Meta to collapse distinct preview-token requests into one cached
  object. Record the verified behavior before rollout.
- Social image URLs retain their existing published media revision. Do not add
  the application build ID to image URLs.
- Current implementation emits the preview URL as `og:url` and the stable URL
  as `rel="canonical"`. This is provisional until the Discord and Meta canaries
  in Phase 5 verify how each platform keys its cached object.

## Cloudflare contract

Cloudflare is an optional delivery layer and must not become the source of
truth for revision or preview identity.

- Keep `/photos/*` HTML origin responses non-cacheable at the edge until an
  explicit HTML caching policy is introduced.
- If HTML edge caching is enabled, include both `rev` and `preview` in the cache
  key. Never use an “ignore query string” rule for post pages.
- Normalize query parameter order or generate it centrally as `rev` followed by
  `preview` to avoid duplicate cache entries.
- Exclude tracking parameters from a custom cache key when the Cloudflare plan
  and configuration support it.
- Mark stale-preview redirects `no-store` so a CDN cannot pin a redirect to an
  obsolete token after a deployment or publication.
- Prefer immutable preview-token responses plus normal expiration over purging.
  If a purge is required, purge the exact URL including its query string.
- Verify origin host/protocol handling behind Cloudflare so canonical and Open
  Graph URLs remain `https://jgantts.com`, never an internal origin address.

## Migration from `build`

1. Introduce the preview model and token without removing `build` handling.
2. Return canonical and share URLs explicitly from public post API responses.
3. Update post cards, gallery overlays, the post page, admin history, copy/share
   controls, and new syndication operations to consume those URLs.
4. Stop generating `build` in new URLs and metadata.
5. Temporarily accept old `build` URLs and redirect them to the equivalent
   current preview URL with `Cache-Control: no-store`.
6. Remove the public build field and build-based redirect after existing links
   and deployed clients have had a compatibility window.
7. Keep the build-information endpoint for diagnostics; it is independent of
   preview identity.

## Implementation phases

### Phase 1 — Preview model

- [x] **1.1** Extract title, description, and social-image resolution into one
  server-side preview-model helper.
- [x] **1.2** Add `PREVIEW_SCHEMA_VERSION` and deterministic canonical
  serialization.
- [x] **1.3** Add SHA-256 token generation and collision-resistant truncation.
- [x] **1.4** Test identical inputs, single-field changes, image changes,
  Unicode, line breaks, missing fields, and schema-version increments.

### Phase 2 — URL model

- [x] **2.1** Extend centralized URL construction to return distinct canonical
  and share URLs.
- [x] **2.2** Keep `rel="canonical"`, JSON-LD, Atom, and sitemap output stable.
- [x] **2.3** Add current, stale, malformed, prior-slug, and unrelated-query
  request tests.
- [x] **2.4** Add explicit non-cacheable headers to temporary preview redirects.

### Phase 3 — Consumers

- [x] **3.1** Expose server-generated canonical and share URLs in public post
  API responses.
- [x] **3.2** Update Vue post cards, gallery overlays, post metadata, and the
  current-post admin link. Historical revision links remain stable canonical
  links because historical snapshots are not publicly rendered.
- [x] **3.3** Update newly queued Mastodon and Facebook operations to capture
  the exact share URL.
- [x] **3.4** Confirm old syndication history remains unchanged and resolvable.

### Phase 4 — Build-token migration

- [x] **4.1** Stop emitting new `build` parameters.
- [x] **4.2** Add the compatibility redirect for existing build-tagged URLs.
- [x] **4.3** Remove build fields from public post types and API payloads.
- [x] **4.4** Retain diagnostic build information outside the URL model.

### Phase 5 — Canary and Cloudflare readiness

- [ ] **5.1** Test first publication, later publication, metadata-only code
  change, unrelated deployment, and hero-image change against a real Discord
  canary channel.
- [ ] **5.2** Test the same cases with Meta's current sharing debugger before
  enabling or changing Facebook production syndication.
- [ ] **5.3** Verify `og:url` identity behavior and record the final decision.
- [ ] **5.4** Run through Cloudflare in a staging hostname with default query
  cache keys, origin cache headers, forwarded host, and HTTPS enabled.
- [ ] **5.5** Verify stale-preview redirects cannot remain cached at the edge.
- [ ] **5.6** Run the complete server checks, frontend production build, local
  smoke test, and production smoke test.

## Test matrix

| Change | Numeric `rev` | `preview` | Canonical URL | Expected unfurl |
| --- | ---: | --- | --- | --- |
| Unrelated code commit | unchanged | unchanged | unchanged | reusable |
| Preview formatting/schema | unchanged | changes | unchanged | refreshed |
| Draft save | unchanged | unchanged | unchanged | unchanged |
| Publish text/location/time edit | increments | changes | new `rev` | refreshed |
| Publish hero/social image edit | increments | changes | new `rev` | refreshed |
| Tracking query only | unchanged | unchanged | unchanged | unchanged |

## Rollback

- Keep canonical route handling independent from preview-token validation so a
  bad preview release can be disabled without making posts unavailable.
- A rollback may stop generating `preview` and redirect share URLs to the
  stable canonical URL.
- Never delete content revisions or syndication history as part of preview URL
  rollback.
- Preserve old `build` and `preview` query compatibility until logs show that
  removing it is safe.

## Completion criteria

- Canonical post identity changes only when the published content revision
  changes.
- Preview URLs change whenever—and only whenever—the rendered Open Graph model
  changes.
- Preview-affecting code changes have an explicit, reviewable schema bump.
- Discord and Meta canary tests demonstrate fresh previews from new share URLs.
- Cloudflare can proxy or cache the site without collapsing distinct preview
  tokens or retaining stale redirects.
- Existing clean, revisioned, build-tagged, and syndicated links remain valid.
