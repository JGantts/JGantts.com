# Facebook Page Syndication Roadmap

Last updated: 2026-09-07

## Objective

Add Facebook as a second explicit syndication destination while keeping
JGantts.com authoritative for every post and photograph. Facebook receives one
Page link post whose URL resolves to the exact published revision on
JGantts.com. A Facebook outage, permission failure, or expired token must never
affect local publication or Mastodon syndication.

```text
Authoring -> JGantts database -> canonical photo/post page
                    |
                    +-> destination-neutral outbox
                           |              |
                           |              +-> Facebook Page link post
                           +-> Mastodon link post
```

## How to use this file

- Treat this file as the implementation state for Facebook syndication across
  sessions.
- Mark an item `[~]` while it is active and `[x]` only after the implementation
  and its relevant tests pass.
- Keep no more than one item active unless work is intentionally parallel.
- Update **Current state**, the date, and the decision log whenever material
  progress is made.
- Recheck Meta's current Graph API version, permissions, review requirements,
  and Page-token lifecycle before starting Phase 1. Those are external policy,
  not stable application assumptions.

## Current state

- Status: In progress — foundation and server-side Facebook queue are implemented; production rollout remains disabled pending Meta verification.
- Active item: 2.6 — add Facebook client and transition tests.
- Next item: 2.6 — add Facebook client and transition tests.
  create and read back a Page link post with the intended credentials.
- Existing foundation: site-owned posts and media, revision-aware canonical
  URLs, per-destination syndication records, a durable SQLite outbox, bounded
  Mastodon retries, private syndication controls, publication history, health
  reporting, structured logs, and backup/restore procedures.
- Main implementation constraint: the TypeScript syndication model, repository,
  worker, history table, admin routes, and UI are currently Mastodon-specific
  even where their database tables use generic names.
- External prerequisites: a Facebook Page, a Meta developer app associated with
  the Page owner/business as required, a server-side Page access token, the Page
  task needed to create content, and the approved permissions required by the
  selected production app mode.

## Fixed architecture decisions

1. JGantts.com remains the canonical source. Facebook is a distribution
   destination and never becomes the source of truth for body text, photos,
   slugs, publication state, or revisions.
2. Version 1 publishes only to a Facebook **Page**, never to a personal profile,
   Group, or Instagram account.
3. Version 1 creates a Page link post using the exact revision-aware canonical
   URL. It does not upload a second copy of the original photos or create native
   Facebook albums, videos, stories, or reels.
4. Local publication, Mastodon syndication, and Facebook syndication are three
   independent, explicit actions. Failure in one destination does not roll back
   or automatically trigger another.
5. Facebook credentials and the Meta Graph API version are server-only
   configuration. Tokens, app secrets, request headers, and raw Graph error
   payloads must never reach the Vue client or logs.
6. Use a Page access token with least privilege. The implementation is expected
   to need `pages_manage_posts` for publishing and `pages_read_engagement` for
   verification/reconciliation; include `pages_show_list` only in a token-setup
   flow that actually enumerates managed Pages.
7. The Meta app must be pinned to an explicit supported Graph API version. A
   version upgrade is a tested maintenance change, not an automatic URL change.
8. Facebook publication uses the existing durable outbox, generalized around a
   destination adapter. Do not add a second polling loop or Facebook-only job
   store.
9. Do not claim exactly-once delivery when Meta does not accept the site's
   idempotency key. A transport timeout after the request body was accepted is
   an **uncertain** result, not an ordinary retryable failure.
10. An uncertain publication must be reconciled against the Page before another
    create call is allowed. If reconciliation cannot prove zero or one matching
    post, require an explicit administrator decision.
11. Local edits never silently edit, delete, or create another Facebook post.
    Version 1 treats the remote Page post as immutable after successful creation.
    A later roadmap may add an explicit remote-update action after Meta's current
    edit semantics are verified.
12. Version 1 does not import Facebook comments, reactions, or counts. Discussion
    stays on Facebook and is reachable through an “Open on Facebook” link.
13. The Facebook link preview is driven by the canonical page's server-rendered
    Open Graph metadata and public image rendition. Do not send crawler-specific
    content that differs materially from the visitor page.
14. Existing Mastodon behavior and stored history must remain backward
    compatible throughout the refactor.

## Version 1 contract

### Author action

For a locally published post, the private editor exposes a separate Facebook
panel with these actions:

- **Publish link on Facebook** when no Facebook syndication exists.
- **Retry** only for a proven pre-publication/transient failure.
- **Reconcile** for an uncertain result.
- **Resolve** when reconciliation returns more than one credible candidate.
- **Open on Facebook** after the remote ID and permalink are known.

The initial request body is empty, matching the current Mastodon flow. Teaser
customization is deferred until there is a shared, destination-aware preview
and validation model.

### Remote payload

The Facebook adapter posts to the configured Page feed with:

- `link`: the exact canonical URL for the published revision;
- `message`: a short derived teaser that remains useful if the link preview is
  unavailable; and
- the configured Page access token, sent only to Meta over HTTPS.

The stored remote identity must include the Graph post ID returned by Meta and a
visitor-facing permalink obtained from the response or a read-back query. Never
construct a permalink by guessing Facebook's URL format.

### State model

```text
not syndicated
      |
      v
   pending -----> published
      |               |
      |               +-> immutable in v1
      +-> failed --------> explicit retry -> pending
      |
      +-> uncertain -----> reconcile -> published
                              |
                              +-> no match -> admin-approved retry
                              +-> multiple/ambiguous -> admin resolution
```

`failed` means the system has evidence that no remote post was created or that
Meta rejected the request before publication. `uncertain` means the create
request may have succeeded but its response was not durably recorded. These
states must not share the same automatic retry behavior.

## Target domain and code shape

### Shared syndication core

- Expand destination types from the literal `mastodon` to a closed union that
  includes `facebook`.
- Replace `MastodonJobKind`/`MastodonJobPayload` assumptions with a discriminated
  job union. Each adapter owns payload validation, publishing, error
  classification, and reconciliation.
- Keep job claiming, locking, retry scheduling, abandonment recovery, and
  terminal transitions in one destination-neutral worker.
- Preserve a deterministic local operation key per syndication publication;
  include the queued local revision in that operation even though Facebook
  cannot be assumed to honor the key.
- Generalize publication history rather than adding another destination-named
  table. Migrate existing `mastodon_publication_history` rows without losing
  order, revision, remote IDs, URLs, or timestamps.
- Add an append-only attempt/event record if needed to distinguish request
  attempts, uncertain outcomes, reconciliation, and manual resolution. Do not
  overload `last_error` with operational history.

### Facebook adapter

- `FacebookClient`: versioned Graph URL construction, HTTPS requests, timeouts,
  response parsing, and safe error normalization.
- `FacebookSyndicationService`: validates post state, derives the teaser and
  canonical revision URL, queues publication, exposes status, and controls retry
  or reconciliation.
- `FacebookPublisher`: executes create/read-back operations through the shared
  worker contract.
- Configuration: `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN`, and
  `FACEBOOK_GRAPH_API_VERSION`. Add an app secret only if the chosen token
  hardening flow uses `appsecret_proof`.
- Startup must disable only Facebook syndication when its configuration is
  absent. A partially configured destination is a clear startup configuration
  error, not a silent disablement.

### Admin API

- `GET /api/admin/posts/:id/syndications/facebook`
- `POST /api/admin/posts/:id/syndications/facebook`
- `POST /api/admin/posts/:id/syndications/facebook/retry`
- `POST /api/admin/posts/:id/syndications/facebook/reconcile`
- `POST /api/admin/posts/:id/syndications/facebook/resolve`

Keep response shapes destination-neutral where practical: destination, state,
publication revision, attempt count, last safe error, remote ID, remote URL,
and timestamps. An uncertain response also includes the safe next action; it
must not expose a token, raw request, or unrestricted upstream response.

## Implementation checklist

### Phase 0 — Meta capability and policy gate

- [ ] **0.1** Create or select the production Meta app and target Facebook Page.
  From a non-production test post, prove that the intended Page access token can
  publish a link post and read back its ID, permalink, message, link/attachment,
  and creation time. Record the exact Graph API version and response shapes.
- [ ] **0.2** Confirm the Page role/task and minimum permissions actually required
  by the production app mode. Determine whether App Review, business
  verification, or a data-use review is required before launch; record owners
  and lead time as launch dependencies.
- [ ] **0.3** Document how the Page token is issued, where it is stored, its
  observed expiry behavior, how validity is checked without logging it, and how
  it is rotated or revoked. Do not label any token “permanent.”
- [ ] **0.4** Run a controlled timeout-after-submit experiment or mock the exact
  ambiguity if production testing would create unwanted posts. Confirm which
  Page read fields can identify a post by canonical URL, derived message, Page,
  and bounded creation window.
- [ ] **0.5** Verify JGantts.com previews in Meta's Sharing Debugger: canonical
  URL, title/description fallbacks, hero rendition, image dimensions, MIME type,
  redirects, and crawler access. Confirm behavior for a first and later
  revision URL.
- [ ] **0.6** Write a short implementation note with the verified endpoint,
  fields, permissions, Graph version, rate-limit headers, error examples,
  review status, and reconciliation query. Update this roadmap if observed Meta
  behavior invalidates any fixed decision.

Exit condition: the real Page/app combination can publish and inspect a link
post, and there is no unresolved policy or token-lifecycle assumption hiding in
the code plan.

### Phase 1 — Destination-neutral syndication foundation

- [x] **1.1** Add an additive migration for the `uncertain` state and a generic
  publication-history/event model. Backfill Mastodon history and prove rollback
  compatibility before removing destination-specific reads.
- [x] **1.2** Generalize TypeScript destination, syndication, outbox payload, and
  job-kind types with exhaustive switches so one destination cannot receive
  another destination's payload.
- [x] **1.3** Refactor the repository to query by `(post_id, destination)` rather
  than embedding `destination = 'mastodon'`; preserve existing uniqueness and
  Mastodon idempotency keys.
- [x] **1.4** Refactor the worker into shared job lifecycle code plus Mastodon and
  Facebook adapters. Preserve Mastodon's current retry, edit, logging, and
  recovery behavior with regression tests before adding live Facebook code.
- [x] **1.5** Make history API responses destination-aware and migrate the admin
  history view from Mastodon-only labels to grouped destination entries.
- [ ] **1.6** Add migration, repository, worker-routing, malformed-payload, and
  old-database upgrade tests.

Exit condition: the existing Mastodon suite passes through a destination-neutral
core and the schema can represent a Facebook publication or uncertain outcome
without special-case tables.

### Phase 2 — Facebook configuration and Graph client

- [x] **2.1** Add strict configuration validation for Page ID, Page token, and a
  pinned Graph API version. Require all or none, reject whitespace/invalid
  version syntax, and cover development and production startup behavior.
- [x] **2.2** Implement the minimal Facebook client against the endpoint and
  response fields verified in Phase 0. Set explicit connect/request timeouts and
  a bounded response-body limit.
- [x] **2.3** Normalize Graph errors using HTTP status plus Meta error code,
  subcode, type, transient flag, trace ID, and relevant retry/rate-limit headers.
  Store and display only bounded, credential-free diagnostics.
- [x] **2.4** Classify outcomes into permanent failure, safe retry, and uncertain.
  Authentication/permission/validation rejection is terminal; throttling and
  proven pre-submit transport failure are retryable; timeout or connection loss
  after submission begins is uncertain unless Meta conclusively rejected it.
- [~] **2.5** Implement Page-post read-back and reconciliation using the verified
  fields and a bounded time window. Automatically attach a remote post only when
  exactly one match satisfies the full comparison.
- [x] **2.6** Add client contract tests for success, malformed JSON, oversized
  responses, OAuth/permission errors, expired tokens, rate limits, transient
  Graph errors, timeouts before and after submit, and response-without-ID.

Exit condition: a fake Graph server can drive every success, failure, retry, and
uncertain transition deterministically without touching Facebook.

### Phase 3 — Durable Facebook publication

- [x] **3.1** Build the Facebook syndication service with published-post checks,
  the shared revision URL helper, a bounded derived teaser, and one
  `(post, facebook)` publication operation whose key records the revision first
  queued. Later local revisions do not create another Facebook post in version
  1.
- [x] **3.2** Queue Facebook publication and its outbox job in the same SQLite
  transaction. Repeated admin requests must return the existing operation.
- [x] **3.3** Publish `message` plus `link`, persist the returned Graph post ID,
  read back and persist a visitor-facing permalink, then atomically complete the
  job and history/event records.
- [x] **3.4** Apply bounded exponential backoff with jitter and Meta-provided
  delay/rate-limit information. Cap attempts and keep Facebook degradation
  independent from Mastodon queue progress.
- [x] **3.5** On an ambiguous result, atomically mark the syndication `uncertain`
  and stop automatic create retries. Implement reconcile and explicit retry
  only after a zero-match result.
- [x] **3.6** Define concurrency across destinations: one slow or rate-limited
  Facebook job must not starve ready Mastodon work. Preserve safe claiming with
  one process now and multiple workers later.
- [ ] **3.7** Test success, duplicate local queue requests, process restart,
  timeout-after-remote-success, zero/one/multiple reconciliation matches,
  throttling, token expiry, permanent validation failure, and simultaneous
  Mastodon/Facebook jobs.

Exit condition: one explicit local action produces at most one automatically
created Facebook Page link post, and every ambiguous delivery stops safely for
reconciliation.

### Phase 4 — Private authoring experience

- [x] **4.1** Add a Facebook panel beside Mastodon with independent status,
  attempts, last safe error, publication revision, and remote link.
- [x] **4.2** Require confirmation before the first remote publication. Explain
  that Facebook publication is separate from saving/publishing locally and is
  immutable through the version 1 interface.
- [x] **4.3** Show pending, published, failed, and uncertain as distinct states.
  Never present an uncertain post as failed or offer an immediate generic Retry
  button.
- [x] **4.4** Add reconciliation UI. For no match, explain and then permit an
  explicit retry; for one match, attach it; for multiple/ambiguous matches,
  display safe candidate permalinks and require the administrator to attach one
  through the resolve endpoint or resolve Facebook manually.
- [x] **4.5** Add Facebook entries to publication history without changing or
  relabeling historical Mastodon entries.
- [ ] **4.6** Add keyboard, mobile, confirmation, reload-recovery, and API-error
  component/end-to-end coverage.

Exit condition: the author can understand and safely resolve every Facebook
state from the private editor without database or command-line access.

### Phase 5 — Preview correctness, operations, and launch

- [x] **5.1** Add Facebook status to health reporting and structured logs without
  making it a hard dependency. Report configuration state, actionable terminal
  failures, oldest ready job, and unresolved uncertain operations; never call
  Meta synchronously on every health request.
- [ ] **5.2** Add destination/job labels to backlog metrics and logs. Verify token,
  app secret, request body, authorization headers, and upstream responses are
  redacted; retain a safe Meta trace ID for support.
- [x] **5.3** Document production configuration, token rotation/revocation,
  permission loss, Graph version upgrades, reconciliation, manual recovery, and
  disabling Facebook without disabling Mastodon.
- [x] **5.4** Add a pre-launch preview checklist for first and later revisions,
  titleless/photo-only posts, missing hero fallback, portrait/landscape images,
  cache refresh, redirects, and archived/unpublished local content.
- [ ] **5.5** Deploy with Facebook publication disabled, run database migration
  and Mastodon regression smoke tests, then enable credentials and restart.
- [ ] **5.6** Publish one production canary, verify its Page identity, teaser,
  exact canonical revision URL, preview, remote permalink, local history, and
  health/log output. Resolve it through the normal admin flow.
- [ ] **5.7** Run the complete server/client suites and live smoke tests. Record
  the pinned Graph version and its support/upgrade date in operations docs.

Exit condition: Facebook Page syndication is operable, observable, documented,
preview-correct, and independently disableable in production with no regression
to local publishing or Mastodon.

## Deferred scope

- Personal-profile or Group publishing.
- Native photo albums, multi-photo posts, video, stories, reels, and Instagram
  cross-posting.
- Facebook scheduling; the local durable outbox remains the scheduler if this is
  added later.
- Automatic Facebook edits or deletion when a local post changes, is archived,
  or is unpublished.
- Importing, displaying, or moderating Facebook comments and reactions.
- Webhooks, except as a later optimization after polling/reconciliation proves
  insufficient.
- Analytics, reach, engagement counts, boosts, advertising, and audience
  targeting.
- Multi-Page or multi-user OAuth onboarding. Version 1 is a single configured
  Page operated by the site owner.

## Test matrix

| Scenario | Local post | Mastodon | Facebook | Required result |
| --- | --- | --- | --- | --- |
| Facebook unconfigured | published | available | disabled | Site and Mastodon continue; Facebook control explains unavailability |
| Facebook permission rejected | published | unaffected | failed | No automatic retry; safe remediation shown |
| Facebook throttled | published | continues | pending | Delay honors upstream guidance without queue starvation |
| Timeout after Page accepted post | published | unaffected | uncertain | No create retry until reconciliation |
| Reconciliation finds one match | published | unaffected | published | Remote ID/permalink attached without another post |
| Reconciliation finds no match | published | unaffected | uncertain | Explicit retry becomes available only after result is stored |
| Reconciliation finds multiple matches | published | unaffected | uncertain | Administrator resolves candidates; no automatic post |
| Process restarts with ready job | published | unaffected | pending | Job is reclaimed once and safely completed |
| Local post is edited later | new local revision | explicit only | unchanged | No silent remote mutation or second Facebook post |
| Page token expires | published | unaffected | failed | Health/admin surface rotation action; token never logged |

## Rollout gates

Do not enable production Facebook publishing until all are true:

- The Page/app/token/permission test in Phase 0 passes in the intended Meta app
  mode.
- Any required App Review, business verification, or data-use review is complete.
- The Graph API version is explicitly pinned and documented.
- The Sharing Debugger shows the expected preview for the live canonical URL.
- Timeout-after-success ends in `uncertain`, not automatic retry.
- A real canary is visible on the correct Page and its ID/permalink are stored.
- Mastodon publication and local authoring regression tests still pass.
- Token rotation and emergency disablement have been rehearsed.

## Decision log

### 2026-09-07 — Initial roadmap

- Chose Page link syndication so JGantts.com retains the canonical content and
  original media.
- Chose one shared outbox with destination adapters instead of parallel
  destination-specific workers.
- Added `uncertain` as a first-class state because a local idempotency key cannot
  by itself prove exactly-once Facebook delivery.
- Deferred Facebook comments and native media to keep permissions, privacy,
  moderation, and failure modes out of the first release.
- Made live Meta capability verification Phase 0 because Page tasks,
  permissions, review requirements, token behavior, and Graph versions are
  external constraints that change independently of this repository.

### 2026-09-07 — Initial implementation slice

- Added destination-aware TypeScript types, an additive schema migration with
  `uncertain`, and shared outbox routing for Facebook link publications.
- Added server-only Facebook configuration, a bounded Graph client, Facebook
  queue/status/retry admin endpoints, and independent service wiring.
- Kept production enablement gated on real Page/token/permission verification;
  the current client fallback permalink is temporary until the verified
  read-back contract is implemented.

## Reference documentation

Verify these again when Phase 0 begins:

- [Meta Pages API: Posts](https://developers.facebook.com/docs/pages-api/posts/)
- [Meta Pages API: Getting Started](https://developers.facebook.com/docs/pages-api/getting-started/)
- [Meta access tokens](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/)
- [Meta Graph API versioning](https://developers.facebook.com/docs/graph-api/guides/versioning/)
- [Meta web sharing guidance](https://developers.facebook.com/docs/sharing/webmasters/)
- [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/)

## Completion criteria

This roadmap is complete when an administrator can explicitly syndicate any
eligible published JGantts.com post at its current revision to the configured
Facebook Page, inspect its independent state and history, open the verified
remote permalink, and safely reconcile an ambiguous delivery—while local
publishing and Mastodon remain fully functional when Facebook is disabled or
unavailable.
