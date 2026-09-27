# Push Notifications Roadmap

Last updated: 2026-09-26

## Objective

Let readers opt in to notifications when a new post is published on JGantts.com.
Tapping a notification opens that post in the website or installed web app.
Use standards-based Web Push with the existing Vue frontend, Express server,
and SQLite content database.

Companion roadmap: [iOS Home Screen App](IOS-HOME-SCREEN-APP-ROADMAP.md).
That roadmap details installation, app identity, icons, standalone navigation,
and physical-device QA. This roadmap owns subscriptions, notification delivery,
and the shared service worker. iOS notification release requires both roadmaps;
other supported browsers can ship first.

## Current state

- Status: Implemented locally; production canaries and physical-device QA remain.
- Active item: Phase 4 — device/provider verification and controlled rollout.
- Implemented: opt-in settings, anonymous installation credentials, atomic SQLite
  first-publication markers, bounded fan-out, retrying worker, author suppression,
  canary controls, shared service worker, and installation assets.
- Delivery defaults to disabled, with an empty canary audience. No production
  subscriptions, notifications, or keys were created during implementation.
- [Current architecture](architecture/server/push.md) and
  [operator runbook](architecture/operations/push.md) describe the implementation.

## Implementation decisions and verification

- Adopted the proposed new-post topic, silent-publication option, 24-hour expiry,
  and 30-day diagnostic retention. The Home Screen app launches at `/photos`.
- SQLite triggers make publication markers atomic for all write paths. Direct
  creation as published is treated as an import and suppressed. Historical
  published revisions seed permanent suppression markers, including unpublished
  posts. A separate push worker leaves the Mastodon outbox unchanged.
- The browser generates and stores its 256-bit management credential before the
  registration request; the server hashes it. This refines the original
  server-issued proposal so a lost first response remains recoverable. An
  additional `DELETE /api/push/subscriptions` accepts endpoint plus credential
  for revocation when that first response's ID was lost.
- A separate `JGANTTS_PUSH_AUDIENCE` setting permits no recipients, selected
  canary IDs, or public delivery. Prior VAPID keys remain available through
  `JGANTTS_PUSH_PREVIOUS_KEYS` during explicit re-subscription.
- Local verification covers transaction rollback, historical seeding, imports,
  suppression, edits/republish, subscription ownership, cancellation, audience
  cutoff, restart/leases, retry limits, shutdown, key validation, DNS pinning,
  redirect rejection, worker click safety, client recovery, and HTTP assets.
- Chrome automation covers real worker registration, installation guidance,
  standalone navigation, no unsolicited permission, narrow/landscape layouts,
  offline-request retries, and keyboard focus. Light/dark screenshots were
  inspected locally. Simulated iOS identity is not physical iOS verification.
- Full frontend and server checks, local smoke, and release packaging are tracked
  in the final verification record below. No provider acceptance or OS delivery
  is claimed from mocked transport tests.

Implementation entry points:

| Area | Existing source or architecture |
| --- | --- |
| Registration and reader controls | [bootstrap](../jgantts-com/src/main.ts), [routes](../jgantts-com/src/router/index.ts), [website shell](architecture/website/shell.md) |
| Publication and revisions | [post service](../jgantts-server/src/posts/post-service.ts), [post repository](../jgantts-server/src/posts/post-repository.ts), [admin routes](../jgantts-server/src/api/admin-posts.ts) |
| APIs and runtime composition | [app](../jgantts-server/src/app.ts), [server](../jgantts-server/src/server.ts), [HTTP boundaries](architecture/server/http.md) |
| Durable state and jobs | [persistence](architecture/server/persistence.md), [existing outbox](architecture/server/syndication/outbox.md) |
| Assets and deployment | [Vite configuration](../jgantts-com/vite.config.ts), [release delivery](architecture/operations/releases.md) |

## First-release contract

The implementation adopts these roadmap defaults.

1. Offer one topic: new public posts, including photo and text posts. No reader
   account is required; consent and subscriptions belong to each browser or
   installed app separately.
2. Provide an explicit `Notify me about new posts` control near the posts/gallery
   navigation and a persistent place to manage notifications. Explain the topic
   before requesting permission. Never prompt on page load.
3. Notify once on a post's first publication after launch. Draft saves, edits,
   revision changes, social syndication, imports, and unpublish/republish cycles
   do not generate another notification. Provide an author option to suppress
   notification on first publication for imports or bulk posting.
4. Existing published history is considered already handled during migration.
   New subscriptions receive future publications only, with no backlog replay.
5. Use a short title and plain-text excerpt, with a generic fallback for untitled
   photo posts. Content-warning posts use neutral copy without revealing the
   protected title, excerpt, or image on the lock screen. Omit rich images in v1.
6. Use the server's canonical `/photos/:slug` URL, including its revision query
   when applicable. Do not use deployment IDs or preview tokens as notification
   identity. Existing slug/revision redirects continue resolving old links.
7. Readers can disable notifications for this installation. Permission denial,
   unsupported environments, and network failures have explicit UI states;
   none prevent normal browsing. Offer the existing Atom feed as a fallback.
8. Push is best effort. A push service accepting a message does not prove that
   a device displayed it or that a reader saw it.

## Browser and iOS requirements

iOS/iPadOS Web Push support began in 16.4 for apps added to the Home Screen;
permission must follow a direct user action inside that app. Use the companion
roadmap's install guidance when a reader is browsing in a normal iOS tab.
Standard Web Push does not require Apple Developer Program membership.
See [WebKit's iOS Web Push documentation](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

Require a secure context and feature-detect service workers, `PushManager`, and
notifications. Prepare registration and the public application server key before
enabling Subscribe, so the permission/subscription flow stays tied to the click.
Subscribe with `userVisibleOnly: true` and the VAPID public key. See
[MDN's subscription API documentation](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe).

Use the interoperable service-worker delivery path for v1. Evaluate
[Declarative Web Push](https://webkit.org/blog/16535/meet-declarative-web-push/)
as a later enhancement; it must not become a prerequisite for other browsers.

## Architecture and delivery contract

### One shared service worker

- Establish `/sw.js` with scope `/` as the single registration shared with the
  Home Screen app. This roadmap owns registration, updates, `push`, and
  `notificationclick`; the companion roadmap must not register a competing worker.
- Explicitly package and serve the worker with a JavaScript MIME type and
  revalidation headers. Serve it before SPA fallback; a missing worker must
  return 404, never application HTML. Keep its URL stable across releases.
- Initially add no fetch interception or offline cache. This preserves server
  redirects, post visibility, API responses, and the separate map asset pipeline.
- Version payloads and keep the worker compatible with queued messages and the
  preceding server release. Do not force a page reload during authoring.
- Parse payloads defensively and use `event.waitUntil()` for visible notification
  display. A malformed message should have a safe generic notification fallback.
- On click, close the notification and focus/navigate a suitable existing window
  or open one. Validate the destination against the configured site origin and
  public post routes; never navigate to an arbitrary payload URL. Preserve an
  active admin editor by opening a separate reader window when possible.

### Subscriptions and API boundaries

Add a dedicated push module and repository, injected through the existing app
and server composition. Implemented endpoints:

| Endpoint | Responsibility |
| --- | --- |
| `GET /api/push/config` | Enabled state, payload version, and public VAPID key only |
| `POST /api/push/subscriptions` | Idempotently register this browser's subscription |
| `DELETE /api/push/subscriptions/:id` | Revoke only a subscription owned by the caller |
| `POST /api/admin/push/test` | Send a fixed test notification to one explicitly selected canary subscription |
| `GET /api/admin/push/status` | Aggregate subscription and queue status for the author |

- Store endpoint, encryption keys, creation/last-seen timestamps, active state,
  VAPID key version, and a hashed management credential. Enforce unique endpoints.
  Accept a browser-generated high-entropy installation credential persisted
  before creation, store only its hash, and require it for mutation. Knowing a row ID or endpoint must not grant access
  or issue a replacement credential for an existing subscription.
- Specify recovery for lost credentials before implementation: unsubscribe the
  old browser subscription and explicitly establish a fresh one. Reconcile
  `getSubscription()`, permission, and server registration on app visits; do not
  depend exclusively on `pushsubscriptionchange` support.
- Registration succeeds in the UI only after server persistence. If it fails
  after browser subscription, retain a recoverable pending state and allow retry.
  Unsubscribe must stop server sends and call the browser's `unsubscribe()`;
  show a retry state if either step fails instead of claiming success.
- Validate request size, endpoint/key format, and same-origin requests; rate-limit
  registration and tests. Protect the sender from SSRF: permit vetted push-service
  HTTPS origins, reject credentials and private/local destinations, and do not
  follow redirects to unvalidated hosts. Test the supported providers explicitly.
- Never expose a public subscription listing or unauthenticated send endpoint.
  Keep endpoints, keys, and management credentials out of logs and analytics.
  Remove revoked/expired subscription secrets and define a short retention period
  for delivery diagnostics before release.

### Publication events and durable delivery

- Add `push_publication_events` and `push_deliveries` alongside
  `push_subscriptions`. Use one unique first-publication event per post and one
  delivery per `(event_id, subscription_id)`; keep the event marker even after
  delivery diagnostics are pruned. Suppressed events remain permanently handled.
- Record publication and its event/suppression marker in the same SQLite
  transaction. Cover every path that can create published content, not just the
  publish HTTP handler. Seed markers from published revision history, including
  posts currently unpublished or archived, to prevent historical resend.
- Capture the event time and payload snapshot. Fan out in bounded, resumable
  batches to subscriptions active at publication; subscriptions created later
  are excluded. Recheck subscription activity and public post status before send,
  and cancel pending work on unpublish/archive. Already delivered lock-screen
  content cannot be recalled. Keep v1 payloads deliberately small.
- Create a dedicated push worker using the existing outbox's repository/worker
  pattern. Keep Mastodon job types and retry behavior independent. Claim jobs
  transactionally with expiring leases; recover interrupted jobs after restart.
- Use a maintained Web Push library for encryption and VAPID signing. Keep
  provider calls outside publication transactions and the publish response path.
- Bound concurrency, request timeouts, attempts, and backoff with jitter. Retry
  timeouts, rate limits (respecting `Retry-After`), and transient server failures.
  Disable expired endpoints on 404/410; surface invalid payload/key failures
  without retry loops. Use a proposed 24-hour event expiry and matching bounded
  provider TTL so delayed jobs cannot produce a stale notification flood.
- Local uniqueness prevents duplicate queue entries, but a crash after provider
  acceptance can still cause redelivery. Use a stable event ID and notification
  tag to reduce duplicate presentation; do not promise exactly-once delivery.
- Stop both workers and await active work before SQLite closes. Report queue
  age, pending/retry/permanent failure counts, and provider acceptance separately
  from site availability; push provider outages must not make posts unavailable.

### Configuration and operations

- Configuration: `JGANTTS_PUSH_ENABLED`, `JGANTTS_PUSH_SEND_ENABLED`,
  `JGANTTS_PUSH_VAPID_PUBLIC_KEY`, `JGANTTS_PUSH_VAPID_PRIVATE_KEY`, and
  `JGANTTS_PUSH_VAPID_SUBJECT`. These are implemented server settings.
- Keep the private key in server secrets, outside source control, build output,
  and browser configuration. Persist it across deploys and back it up securely.
  Use separate keys, origins, subscriptions, and databases for staging.
- Define a key-rotation procedure that retains old signing keys while their
  subscriptions migrate through explicit re-subscription. Do not regenerate
  keys on startup or assume a new key works with old subscriptions.
- Disabled enrollment must not prevent unsubscribe. A send kill switch stops
  dispatch without deleting state; event expiry still applies on re-enable.
- Update schema compatibility declarations, backup/recovery guidance, deployment
  environment examples, and release smoke checks with the implementation.

## Implementation phases

### Phase 1 — Contracts and shared worker foundation

- [x] **1.1** Confirm the new-post topic, automatic first-publication policy,
  author suppression control, payload copy, and expiry/retention defaults.
- [x] **1.2** Agree on worker ownership and installation handoff with the
  [iOS Home Screen App roadmap](IOS-HOME-SCREEN-APP-ROADMAP.md).
- [x] **1.3** Add and verify stable worker delivery in local development and a
  packaged production build, with no runtime cache.

Exit condition: the worker loads correctly and the two roadmaps share one
registration contract.

### Phase 2 — Consent and subscription lifecycle

- [x] **2.1** Add migrations, repository, configuration, validation, management
  credentials, and registration/revocation APIs.
- [x] **2.2** Implement subscribe/settings controls with unsupported, install
  required, default, denied, subscribed, pending, and error states.
- [x] **2.3** Implement reconciliation, revoke/re-subscribe, lost-credential
  recovery, and a restricted single-device test action.

Exit condition: an opted-in canary device receives a test notification, and
unsubscribe prevents further sends to that subscription.

### Phase 3 — Publication and delivery

- [x] **3.1** Add atomic first-publication events, historical markers, author
  suppression, and resumable recipient fan-out.
- [x] **3.2** Implement the push worker, retries, lease recovery, endpoint
  cleanup, cancellation, expiry, and graceful shutdown.
- [x] **3.3** Add payload rendering, visible notifications, safe click routing,
  administrative status, and redacted operational metrics.

Exit condition: a new publication reaches eligible subscribers across restart
and retry scenarios without affecting publication or social syndication.

### Phase 4 — Verification and rollout

- [x] **4.1** Test transaction rollback, duplicate publish requests, edits,
  republishing, imports, historical seeding, and post suppression.
- [x] **4.2** Test audience cutoff, unsubscribe during fan-out, archive before
  send, expired events, lost leases, transient failures, invalid endpoints,
  credentials, request limits, and outbound URL validation.
- [x] **4.3** Test component state transitions and worker payload/click handling,
  including failed server registration and existing windows.
- [ ] **4.4** Run actual push canaries in supported desktop Chrome/Edge, Firefox,
  Safari, and Android Chrome. Record OS/browser versions and limitations.
- [ ] **4.5** Complete companion-roadmap device QA for installed iPhone/iPad apps:
  foreground/background/closed app, locked device, permission denial/revocation,
  offline then reconnect, app removal/reinstall, and notification deep links.
  Browser automation alone is not evidence of OS notification delivery.
- [x] **4.6** Run frontend tests/build, server check/build, and local smoke checks
  from [development checks](architecture/operations/development.md). Extend
  release smoke checks for worker/manifest MIME types and cache headers.
- [ ] **4.7** Deploy with sends disabled, verify migrations and assets, then
  allow only canary subscription IDs. Enable public enrollment and delivery
  after verification; prevent queued pre-launch content from broadcasting.

## Rollback and completion criteria

Disable sending first if failures or unexpected broadcasts occur. Preserve
subscription/event state and VAPID secrets; do not roll back by deleting tables.
Keep `/sw.js` and old payload handling available because installed workers can
outlive a deployment. Test server rollback against the migrated schema and
re-enablement without replaying expired work.

The feature is complete when consent and revocation work per installation,
eligible first publications produce durable bounded delivery, clicks resolve to
the correct public post, deployment/restart does not lose work or replay history,
and recorded browser/device canaries pass. The iOS release additionally requires
the companion roadmap's installation and navigation acceptance criteria.

Out of scope for v1: native App Store distribution, silent background pushes,
comment/reply notifications, per-author topics, digests, unread badges, reader
accounts, and offline post/media storage.

## Remaining release evidence

- [ ] Real desktop/Android provider canaries with OS/browser versions recorded.
- [ ] Physical iPhone/iPad installation, delivery, Focus/lock-screen, removal,
  reinstall, VoiceOver, and notification deep-link checks.
- [ ] HTTPS staging/production VAPID configuration and single-device canary.
- [ ] Compatible schema-14 rollback rehearsal and installed-worker update check.
- [ ] Public enablement after canary-era pending work is cancelled.

No unchecked release item is implied complete by the local implementation.

## Local verification record — 2026-09-26

- Server `npm run check`: 104 tests passed, including transport, persistence,
  migration, lifecycle, cancellation, and HTTP contracts; type checking passed.
- Frontend `npm test`: 54 tests passed. `npm run build` passed; the existing
  large map bundle warning remains.
- Complete Chrome Playwright suite: 17 passed on the branch rebased onto current
  production, including a live service-worker update that waits without reloading
  the open page.
- Server `npm run smoke:local` passed against compiled output.
- `node scripts/test-package-release.js` passed, including required installation
  assets and failure when the worker is absent.
- A locally packaged archive was extracted and started against an isolated
  migrated database; install/settings HTML, worker, manifest, four PNG icons,
  and disabled push configuration all passed HTTP checks.
- No production deployment or physical-device test was performed.

### Subscription-renewal follow-up

Regression tests reproduced and now cover two additional renewal failures:
permission-dismissed setup uses the current signing key on its next explicit
attempt, while established subscriptions still require a reset for VAPID rotation.
Authenticated re-registration refreshes browser encryption keys without changing
the installation ID or publication audience cutoff. Prepared deliveries using
superseded keys lose their leases and retry with current keys; already accepted
messages are not replayed. Server checks, frontend tests/build, and compiled-server
smoke checks passed again after these fixes.

### Integration and hosted CI

The implementation is committed on `feat/push-home-screen`, based on production
commit `32fed1b`. The newer image-processing progress behavior is preserved.
Local server/frontend checks, all 17 browser tests, smoke checks, and packaging
pass on the integrated branch. The first hosted CI run passed application, map,
installer, activation/automatic-rollback, and recovery tests; its systemd check
exposed a runner-only missing `/usr/bin/node` path. CI now supplies that path from
`setup-node` without altering the production unit or the self-hosted deploy job.

GitHub exposes only a production environment, and creating a draft PR with the
current credentials was denied. The remote feature branch is available; no merge
or production deployment has been performed. Hosted fixture rollback tests do
not replace the pending schema-14 production-compatible rollback rehearsal.


### Installation UUIDs — 2026-09-27

Schema 15 adds random UUIDs for public installation identity, backfills existing
subscriptions, and preserves integer queue relationships and audience cutoffs.
Registration returns the UUID; authenticated browser reconciliation upgrades its
cached numeric ID without changing consent or encryption keys. Test sends and
revocation accept UUIDs, and existing numeric audience configuration remains
compatible during rollout. See the [operations guide](architecture/operations/push.md#installation-identifiers).
