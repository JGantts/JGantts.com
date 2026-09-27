# Push notifications

**Responsibility:** per-installation notification consent, atomic first-publication
tracking, and durable Web Push delivery independent of Mastodon.

**Entry points:** `/api/push/config`, subscription POST/DELETE routes, authenticated
`/api/admin/push/status` and `/api/admin/push/test`, and `PushWorker` at startup.

**Dependencies:** SQLite migration 14 and publication triggers; VAPID keys from
server configuration; `web-push` for encryption/signing; a pinned, validated HTTPS
transport. Allowed providers are Apple's Web Push, Google FCM, Mozilla production
push, and Windows notification hosts. Requests never follow redirects.

**Invariants:** events share the publication transaction and are unique per post.
A subscription ID cutoff excludes later enrollments. Explicit suppression,
imports created as published, existing publication history, and disabled
enrollment create permanently suppressed markers. Unpublish/archive cancels
pending work; republishing does not reset the marker. A first publication is
queued only while enrollment is enabled. Events expire after 24 hours.

Subscriptions have a browser-generated random 256-bit management credential,
stored before the registration request so lost responses can be retried. The
server stores only its hash. Registering an existing endpoint requires that
credential; knowing the endpoint or ID cannot reset ownership. DELETE by endpoint
supports revocation after a lost registration response, even with enrollment off.
Authenticated re-registration refreshes browser encryption material while keeping
the subscription ID and signing-key version. A key change invalidates processing
leases so unsent work uses the new material; accepted deliveries are not replayed.
Revocation removes endpoint/encryption secrets and cancels pending deliveries.

The worker claims up to four jobs per tick with 60-second leases and at most six
attempts. Transient failures retry with jitter and `Retry-After`; 404/410 disables
the endpoint. Provider acceptance is distinct from display or reader receipt.
A crash after provider acceptance can duplicate delivery; stable notification
tags reduce repeated presentation, not guarantee exactly-once display. Both
workers stop before database closure.

Diagnostic delivery rows and payload snapshots are retained for 30 days after
expiry/terminal activity; publication markers remain to prevent replay.
Operational errors record IDs and status codes, never provider payloads or URLs.
The status API is administrative; site health does not depend on provider uptime.

**Source:** [push module](../../../jgantts-server/src/push),
[API](../../../jgantts-server/src/api/push.ts),
[worker](../../../jgantts-com/PUBLIC/sw.js),
[settings](../../../jgantts-com/src/views/NotificationsView.vue).

See [push operations](../operations/push.md),
[Home Screen app](../website/home-screen.md), and
[roadmap / remaining release gates](../../PUSH-NOTIFICATIONS-ROADMAP.md).

Installation IDs exposed to readers are UUIDs (migration 15); integer primary keys remain internal for queue relationships and audience cutoffs. Audience settings and installation API parameters accept UUIDs only.
