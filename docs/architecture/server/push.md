# Push notifications

**Responsibility:** per-installation notification consent, atomic first-publication
tracking, and durable Web Push delivery independent of Mastodon.

**Entry points:** `/api/push/config`, subscription POST/DELETE routes, authenticated
`/api/admin/push/status`, `/api/admin/push/dashboard`, and `/api/admin/push/test`, and `PushWorker` at startup.

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

Publication and admin test requests wake the worker immediately after queue commit.
A wake during an active send requests another pass without overlapping workers.
The five-second poll remains for retries and restart recovery. Visible notifications
request high Web Push urgency; provider acceptance logs include the event ID and
elapsed milliseconds since queue creation to distinguish server and device delays.

The worker claims up to four jobs per pass with 60-second leases and at most six
attempts. It yields between batches and continues until ready work is drained;
future retries retain their scheduled backoff. Transient failures retry with jitter and `Retry-After`; 404/410 disables
the endpoint. Provider acceptance is distinct from display or reader receipt.
A crash after provider acceptance can duplicate delivery; stable notification
tags reduce repeated presentation, not guarantee exactly-once display. Both
workers stop before database closure.

Diagnostic delivery rows and payload snapshots are retained for 30 days after
expiry/terminal activity; publication markers remain to prevent replay.
Operational errors record IDs and status codes, never provider payloads or URLs.
The status and dashboard APIs are administrative and read-only; site health does not depend on provider uptime.
The dashboard returns the latest 50 events and 100 deliveries/installations using explicit
projections that omit endpoints, credentials, encryption keys, and payload bodies.
Waiting age starts at event creation, including events that have not been fanned out.

**Source:** [push module](../../../jgantts-server/src/push),
[API](../../../jgantts-server/src/api/push.ts),
[worker](../../../jgantts-com/PUBLIC/sw.js),
[settings](../../../jgantts-com/src/views/NotificationsView.vue).

See [push operations](../operations/push.md),
[Home Screen app](../website/home-screen.md), and
[roadmap / remaining release gates](../../PUSH-NOTIFICATIONS-ROADMAP.md).

Installation IDs exposed to readers are UUIDs (migration 15); integer primary keys remain internal for queue relationships and audience cutoffs. Audience settings and installation API parameters accept UUIDs only.

Subscriber frequency preferences (migration 16) default to 2 per rolling 24 hours
and 3 per rolling 7 days for both existing and new installations. Either limit
can be null (unlimited), or an integer 0–1000. Both caps apply per installation;
0 skips all publication notifications. Authenticated re-registration preserves
these choices. GET/PUT `/api/push/subscriptions/:id/preferences` require the
installation management credential; PUT also requires same origin.

Claiming a publication atomically counts provider-accepted deliveries in the
window plus processing reservations. A retry excludes its own reservation.
Over-limit jobs are cancelled with `daily_limit` or `weekly_limit` skip reasons,
never deferred/replayed. Tests neither consume nor obey these caps. Changes
apply to new claims; an already sending notification may finish. Accepted
provider requests are counted, since physical device display is not observable.
Schema compatibility prevents an older release that ignores caps from opening
the migrated database.
