# Site-Owned Posts Roadmap

Last updated: 2026-09-04

## Objective

Make JGantts.com the canonical source for posts and their media. Mastodon is a
syndication destination: its post points to the canonical JGantts.com page, and
Mastodon remains the source of truth for replies made on Mastodon.

```text
Authoring -> JGantts database -> canonical post page
                    |
                    +-> syndication outbox -> Mastodon link post
                                                |
                                                +-> Mastodon replies
                                                     displayed on JGantts.com
```

## How to use this file

- Treat this file as the implementation state shared across sessions.
- Before starting work, read the decisions, current state, and applicable phase.
- Change `[ ]` to `[x]` only after the item and its relevant tests are complete.
- Use `[~]` for an item actively in progress, with a short note in **Current
  state**. Do not leave more than one `[~]` item unless the work is intentionally
  parallel.
- Add newly discovered work to the appropriate phase rather than relying on chat
  history.
- Record material architecture changes in **Decision log**.
- Update the date above and **Current state** whenever implementation progress is
  made.

## Current state

- Status: Phases 1–3 complete; Mastodon syndication is next.
- Active item: None.
- Next item: 4.1 — add server-only Mastodon configuration and scoped credentials.
- Existing implementation: `/photos` contains six hard-coded Mastodon status IDs.
  The Vue client requests each status and its context directly from
  `mastodon.social` and treats the Mastodon response as both post content and
  comments.
- Known unrelated working-tree changes existed when this roadmap was created;
  implementation must preserve them.

## Fixed architecture decisions

1. JGantts.com owns post text, publication state, timestamps, media, canonical
   URLs, and revision history.
2. A local immutable ID identifies a post. Mastodon status IDs are external
   syndication identifiers, never local primary keys.
3. Canonical public URLs use `/posts/:slug`. Old slugs and legacy
   `/photos/:mastodonId` URLs redirect to the canonical URL.
4. Publishing locally and syndicating to Mastodon are separate operations.
   Mastodon failure must not roll back local publication.
5. Mastodon publication is performed through a durable database outbox with an
   idempotency key.
6. New Mastodon posts contain a teaser and canonical link. The complete post and
   original media are hosted on JGantts.com.
7. Mastodon remains authoritative for Mastodon replies. Local reply data is only
   a normalized, expiring cache and must link to the original status.
8. Mastodon credentials stay on the Express server and are never exposed to the
   Vue client.
9. Initial persistence uses SQLite in WAL mode and a persistent media directory
   outside the deployed application tree.
10. ActivityPub federation is out of scope for the initial implementation.

## Target runtime layout

The exact paths must be configurable, but production should default to a
persistent location resembling:

```text
/var/lib/jgantts/
  content.sqlite
  media/
    originals/
    derived/
```

This content must not be stored beneath the directory replaced by the current
deployment workflow.

## Target domain model

### Post

- Immutable local ID: ULID or UUID.
- Optional title, with an accessible fallback for titleless photo posts.
- Unique current slug plus redirect records for prior slugs.
- Source body in Markdown.
- Derived, sanitized HTML.
- Optional excerpt and content warning.
- Draft, published, or archived state.
- Created, published, and updated timestamps.
- Optional canonical hero/social media reference.

### Media

- Immutable local ID and owning post.
- Original and derived-file locations.
- MIME type, dimensions, byte size, and checksum.
- Alt text, optional focal point, and display order.
- Stable public URL controlled by JGantts.com.

### Syndication

- Local post ID, destination, remote instance, remote status ID, and remote URL.
- Pending, published, or failed state.
- Attempt count, last error, and timestamps.
- Stable idempotency key for each publication revision.

### Comment cache

- Local post ID and Mastodon root status ID.
- Normalized remote comment payload and fetch timestamp.
- Short freshness lifetime, with stale-on-error behavior.
- This cache is explicitly non-authoritative.

## Implementation checklist

### Phase 1 — Persistence foundation

- [x] **1.1** Add configuration for the SQLite database and media roots; document
  development and production paths and ensure production data is outside the
  deployment target.
- [x] **1.2** Select a maintained SQLite driver compatible with the production
  Node version and add it to the server.
- [x] **1.3** Add a migration runner and initial schema for posts, slug redirects,
  media, syndications, outbox jobs, and Mastodon comment cache.
- [x] **1.4** Enable WAL mode, foreign keys, busy timeout, and safe transaction
  helpers.
- [x] **1.5** Add repository/service boundaries so API routes do not issue ad hoc
  SQL.
- [x] **1.6** Add database migration and repository tests using isolated temporary
  databases.
- [x] **1.7** Document backup and restore commands for the database and original
  media; validate a restore in a temporary location.

Exit condition: the server can create, read, update, and migrate posts in a
persistent local database, and backup restoration has been tested.

### Phase 2 — Canonical post API and media

- [x] **2.1** Implement public `GET /api/posts` with stable ordering and pagination.
- [x] **2.2** Implement public `GET /api/posts/:slug`, including old-slug
  resolution.
- [x] **2.3** Implement authenticated admin create and update endpoints.
- [x] **2.4** Implement an explicit publish operation with transactional state and
  timestamp changes.
- [x] **2.5** Render Markdown to sanitized HTML and test unsafe-input handling.
- [x] **2.6** Implement authenticated media upload with type and size validation,
  checksum generation, alt text, and deterministic paths.
- [x] **2.7** Generate required image derivatives without altering the original.
- [x] **2.8** Serve local media with appropriate content type, caching, and
  immutable URLs.
- [x] **2.9** Add authorization, validation, error-shape, and API integration tests.

Exit condition: a post and its media can be authored and published entirely on
JGantts.com without Mastodon.

### Phase 3 — Canonical pages and discovery

- [x] **3.1** Add `/posts/:slug` to the Vue router and render local post content.
- [x] **3.2** Add the posts index or adapt the current `/photos` experience to use
  local post records.
- [x] **3.3** Make Express resolve post metadata for the initial HTML response.
- [x] **3.4** Emit canonical URL, `og:type=article`, Open Graph, Twitter Card,
  publication timestamps, and JSON-LD metadata per post.
- [x] **3.5** Ensure canonical content has a useful no-JavaScript response or
  server-provided initial payload.
- [x] **3.6** Add draft, missing, and archived post behavior with correct HTTP
  statuses.
- [x] **3.7** Generate RSS or Atom and update the sitemap from local posts.
- [x] **3.8** Add page and metadata integration tests, including social preview
  crawler requests.

Exit condition: each published post is a stable, crawlable, shareable canonical
web document with no dependency on Mastodon availability.

### Phase 4 — Mastodon syndication

- [x] **4.1** Add server-only Mastodon configuration and minimally scoped tokens.
- [x] **4.2** Insert a syndication outbox job transactionally when requested after
  local publication.
- [x] **4.3** Implement a worker that claims jobs safely and survives process
  restarts.
- [x] **4.4** Generate a Mastodon teaser containing the canonical URL and respecting
  the instance character limit.
- [x] **4.5** Publish with a stable Mastodon idempotency key to prevent duplicate
  posts during retries.
- [x] **4.6** Persist the returned Mastodon status ID and URL on success.
- [x] **4.7** Add bounded retry/backoff, failure visibility, and manual retry.
- [x] **4.8** Define and implement edit behavior: local edits remain authoritative;
  teaser edits are an explicit operation rather than automatic two-way sync.
- [x] **4.9** Test success, timeout-after-success, duplicate retry, rate limiting,
  authentication failure, and Mastodon outage behavior.

Exit condition: publishing on JGantts.com can reliably produce exactly one
Mastodon link post, without coupling local availability to Mastodon.

### Phase 5 — Mastodon replies on canonical posts

- [ ] **5.1** Implement a server-side Mastodon client for status context requests.
- [ ] **5.2** Add `GET /api/posts/:id/comments/mastodon` or an equivalent slug-based
  endpoint.
- [ ] **5.3** Normalize remote statuses into an internal comment response instead
  of exposing the Mastodon API model to Vue.
- [ ] **5.4** Sanitize all remote HTML and constrain external media and links.
- [ ] **5.5** Cache responses briefly and serve stale cached comments when Mastodon
  is unavailable.
- [ ] **5.6** Preserve reply threading and handle replies whose parent is absent.
- [ ] **5.7** Label the UI “Replies on Mastodon,” link every reply to its source,
  and add a “Reply on Mastodon” action.
- [ ] **5.8** Represent unavailable, deleted, limited-visibility, and truncated
  threads honestly.
- [ ] **5.9** Test hostile content, cache expiry, stale-on-error, empty threads,
  nesting, and upstream limits.

Exit condition: the site presents Mastodon discussion as a safe remote projection
while clearly retaining Mastodon as its source of truth.

### Phase 6 — Existing post migration

- [ ] **6.1** Build a repeatable importer for the six currently hard-coded Mastodon
  posts.
- [ ] **6.2** Download and checksum original media; retain dates, alt text, content
  warnings, and source URLs.
- [ ] **6.3** Create local posts and syndication mappings without altering original
  Mastodon timestamps or identities.
- [ ] **6.4** Compare every migrated post and media asset against the remote source.
- [ ] **6.5** Replace direct Mastodon post fetching in
  `jgantts-com/src/views/photos/IndexView.vue` with the local post API.
- [ ] **6.6** Remove the hard-coded Mastodon status-ID list.
- [ ] **6.7** Redirect each legacy `/photos/:mastodonId` URL to its canonical post.
- [ ] **6.8** Decide whether to edit historical Mastodon posts to add canonical
  links; perform this only after canonical pages are live and verified.
- [ ] **6.9** Verify migration and redirects in staging or locally before production
  deployment.

Exit condition: all existing photo posts remain accessible, are owned locally,
and use Mastodon only for their remote discussion.

### Phase 7 — Production operations and launch

- [x] **7.1** Provision persistent production data/media paths with least-privilege
  ownership for the systemd service.
- [x] **7.2** Update deployment without copying over or deleting runtime content.
- [ ] **7.3** Add a pre-deploy database backup and a documented rollback procedure.
- [ ] **7.4** Add health checks for database readiness, media writability, outbox
  backlog, and Mastodon degradation without making Mastodon a hard dependency.
- [ ] **7.5** Add structured logs that never contain credentials or full private
  request bodies.
- [ ] **7.6** Run the complete server and client test suites and production smoke
  tests.
- [ ] **7.7** Verify canonical tags, previews, RSS/Atom, sitemap, redirects, media,
  and replies against the live domain.
- [ ] **7.8** Confirm automatic backups and perform one production-data restore
  rehearsal.

Exit condition: the system is deployed, observable, backed up, reversible, and
the live site is the demonstrable source of truth.

## Explicitly deferred

- Hosting a local comment system.
- Mirroring favourites, boosts, or impression counts as authoritative data.
- Full ActivityPub actor/inbox/outbox support.
- Automatic bidirectional edits or deletion propagation.
- Moving media to object storage unless local operational needs justify it.
- Syndication destinations other than Mastodon.

## Decision log

### 2026-09-04 — Initial architecture

- Chose a POSSE-style flow: publish on JGantts.com, then syndicate a link.
- Chose SQLite and persistent local media for the first deployment because the
  application currently runs as a single Node service on one Linode.
- Kept Mastodon authoritative for replies while placing fetching, normalization,
  sanitization, and caching behind the Express server.
- Deferred ActivityPub to keep the initial scope focused on content ownership and
  reliable publishing.

### 2026-09-04 — Persistence foundation

- Selected `better-sqlite3` 13 and standardized the server runtime on Node 22,
  matching the production deployment workflow.
- Development content defaults to `jgantts-server/.data`; production defaults to
  `/var/lib/jgantts` and rejects locations inside the deployment tree.
- Added transactional migrations, post revisions and slug redirects, repository
  and service boundaries, and application-aware SQLite/media backup.
- Verified the foundation with 20 passing server tests and a production build;
  the persistence suite includes a temporary backup-and-restore rehearsal.

### 2026-09-04 — Public post API

- Wired the production content database into Express through `PostService` and
  `PostRepository`, keeping SQL out of API routes.
- Added stable `(published_at, id)` cursor pagination and current/prior-slug
  lookup for published posts. Drafts and archived posts are not exposed.
- Added cache headers, canonical API `Content-Location`, pagination validation,
  and integration coverage. All 22 server tests and the production build pass.

### 2026-09-04 — Canonical authoring and media API

- Added server-only bearer authentication controlled by `JGANTTS_ADMIN_TOKEN`;
  when no token is configured the write API fails closed while public reads work.
- Added validated draft creation and editing, explicit idempotent publishing, and
  Markdown rendering through an HTML allowlist sanitizer.
- Added JPEG, PNG, WebP, and AVIF upload up to 25 MB with required alt text,
  SHA-256 checksums, original-byte retention, and large/thumbnail WebP variants.
- Public media URLs resolve from database records, do not reveal filesystem
  paths, reject path traversal, and return immutable cache headers.
- Verified the complete Phase 2 server with 27 passing tests and a production
  build, including authenticated multipart upload and public media delivery.

### 2026-09-04 — Production persistence provisioned

- Provisioned `/var/lib/jgantts` and media subdirectories as mode `0750`, owned by
  the `jgantts-com` systemd service account.
- Installed the protected systemd environment file with the data root and admin
  token; deployed Phase 2 successfully without placing runtime data in the
  application deployment tree.
- Verified the live health, public posts, error paths, and fail-closed admin API
  on `jgantts.com` at commit `12a8038`.

### 2026-09-04 — Canonical pages and discovery

- Added an optional post title through a production-safe version-two migration;
  titleless posts use “Post by Jacob Gantt” as their accessible fallback.
- Added the `/posts` index and `/posts/:slug` Vue views with local media, content
  notes, responsive presentation, loading, empty, and missing states.
- Canonical requests now resolve through Express, redirect old slugs, return 404
  for missing/draft posts and 410 for archived posts, and include useful readable
  content plus an initial JSON payload before JavaScript runs.
- Added canonical and article metadata, publication timestamps, Open Graph,
  Twitter Card, JSON-LD, an Atom feed, and a database-driven sitemap.
- Verified with 30 passing server tests, production server/client builds, and
  browser QA at desktop and 390 px mobile widths, including client navigation
  metadata and horizontal-overflow checks.

### 2026-09-04 — Durable Mastodon syndication

- Added server-only `MASTODON_BASE_URL` and `MASTODON_ACCESS_TOKEN`
  configuration. The feature fails closed unless the Mastodon origin, access
  token, and canonical `SITE_ORIGIN` are all present.
- Added an explicit authenticated operation that transactionally creates one
  Mastodon syndication and durable outbox job per canonical post. Repeated calls
  and later local revisions reuse the same remote publication.
- Added a restart-safe worker with stale-lock recovery, bounded exponential
  retry, `Retry-After` handling, permanent-error handling, manual retry, and a
  stable idempotency key for uncertain outcomes.
- The worker reads the instance status limit, creates a conservative teaser with
  the canonical URL, and persists the Mastodon status ID and URL. Local edits do
  not propagate unless the explicit teaser-edit operation is requested.
- Verified configuration, status construction, instance API behavior, success,
  duplicate requests, timeout-after-send, rate limiting, authentication failure,
  manual retry, explicit edits, and crash recovery with 42 passing server tests.

## Definition of done

This roadmap is complete when:

- New posts and original media are durably stored under JGantts.com control.
- Every post has a stable canonical page and correct initial-response metadata.
- Mastodon receives a link post through a retry-safe asynchronous workflow.
- Mastodon replies appear safely on the canonical page and link back to Mastodon.
- Existing photo posts and URLs have been migrated without losing content.
- Mastodon downtime does not prevent reading or publishing canonical posts.
- Backup, restore, deployment, monitoring, and rollback procedures are verified.
