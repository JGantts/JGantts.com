# Push notification operations

Push is disabled by default. Installation assets can ship before public sending.
Use a staging HTTPS origin and separate database/keys for verification; never
point a development client at the production subscription API.

## Configuration

Set these in the existing server environment file, with its existing restricted
permissions. Restart the application after changes.

| Variable | Meaning |
| --- | --- |
| `JGANTTS_PUSH_ENABLED` | `true` permits enrollment and first-publication events; otherwise those publications remain suppressed |
| `JGANTTS_PUSH_SEND_ENABLED` | `true` permits worker dispatch; false is the send kill switch |
| `JGANTTS_PUSH_AUDIENCE` | Empty sends to nobody; comma-separated installation UUIDs permit canaries; `*` permits all subscribers |
| `JGANTTS_PUSH_VAPID_PUBLIC_KEY` | Current P-256 public key, base64url |
| `JGANTTS_PUSH_VAPID_PRIVATE_KEY` | Corresponding private key; server secret, never a Vite variable |
| `JGANTTS_PUSH_VAPID_SUBJECT` | Operator contact, normally `mailto:contact@jgantts.com` |
| `JGANTTS_PUSH_PREVIOUS_KEYS` | Optional JSON array of `{ "publicKey": "...", "privateKey": "..." }` retained during rotation |
| `SITE_ORIGIN` | Exact HTTPS origin used for same-origin mutation checks |

Generate a VAPID pair once using the installed `web-push generate-vapid-keys`
CLI, and transfer it directly into the restricted environment file. Never put
private keys into command arguments, commit messages, build output, screenshots,
or support logs. Keys are not generated automatically on server start.

Deployment uses the standalone server lockfile as well as the repository lockfile.
Update both when changing the sender library. The release packager requires the
worker, manifest, and PNG icons; smoke tests inspect content types/cache headers.

## Canary and public rollout

1. Back up content, verify schema compatibility, and deploy with both push flags
   false and audience empty. Validate `/sw.js`, `/manifest.webmanifest`, icons,
   `/install`, and `/notifications` on the production origin.
2. Enable enrollment, retain an empty audience, and enroll the operator's test
   installation using the ordinary settings flow. Record its installation UUID.
3. Set the audience to that UUID, enable sending, and use the authenticated editor's
   Push notifications panel to send a fixed test. No arbitrary public send API
   exists. Record actual OS appearance and post-click behavior separately from
   the server's `accepted` count.
4. Verify first publication, silent publication, edits, republish, unsubscribe,
   offline/reconnect, and revoked permission on each supported platform. Capture
   OS/browser versions and the physical iPhone/iPad Home Screen results.
5. Before switching audience to `*`, cancel pending canary-era events so they
   cannot later reach other subscribers. With sends disabled and the worker
   stopped, use a transaction on the backed-up database:

   ```sql
   BEGIN IMMEDIATE;
   UPDATE push_publication_events SET state = 'cancelled'
     WHERE state IN ('pending', 'expanded');
   UPDATE push_deliveries SET state = 'cancelled', lease_token = NULL
     WHERE state IN ('pending', 'processing');
   COMMIT;
   ```

6. Set the public audience and re-enable sends. New subscriptions receive only
   future publications. Monitor active installations, retrying deliveries,
   permanent failures, and oldest pending age via `/api/admin/push/status`.

Registration and tests are rate-limited in process, keyed by Express's trusted
request IP. This application currently does not trust forwarded IP headers;
behind a proxy the limit is shared by the proxy address. Keep the conservative
limits for launch and configure a trusted proxy boundary or edge limit before
increasing traffic. Do not blindly trust `X-Forwarded-For` from arbitrary clients.

## Installation identifiers

Schema 15 assigns a random UUID to each installation, including existing subscriptions.
Readers see this UUID in notification settings, and the author uses it for test sends
and `JGANTTS_PUSH_AUDIENCE`. Authenticated reconciliation replaces a browser's cached
numeric ID without requesting permission again. Audience entries and installation
API parameters must be UUIDs; replace numeric audience entries before deployment.
Integer database keys remain internal for queue foreign keys and publication cutoffs.
The management credential, not knowledge of the UUID, authorizes revocation.

## Retention, recovery, and key rotation

- Database backups include subscription secrets. Restrict and retain them under
  the existing content backup policy; revoked secrets disappear from the live
  database but remain in old backups until backup retention expires.
- Back up VAPID keys separately in a restricted secret store. Restoring only the
  database without its signing keys does not restore delivery.
- After a database restore, keep sends off, cancel stale work as above, and verify
  canaries before restarting public delivery. Restoring an older database may
  restore consent that was revoked later; require re-enrollment if revocation
  state cannot be preserved. Do not automatically broadcast from a restored queue.
- Keep the old pair in `JGANTTS_PUSH_PREVIOUS_KEYS` while changing the current pair.
  Existing subscriptions retain their signing key version. Returning readers see
  a reset/reconnect action and explicitly re-subscribe under the new key. Remove
  old keys only after their active subscriptions have migrated or been revoked.
- Providers returning 404/410 cause automatic secret removal. Diagnostic delivery
  rows and event payloads are pruned after 30 days; lightweight first-publication
  markers and hashed revocation tombstones remain to prevent replays or ownership
  takeover. There is no tracking of whether readers saw a notification.

## Rollback

Disable sending and restart first. Unsubscribe still works with enrollment off.
Keep the manifest identity, launch/deep-link routes, icon URLs, and worker URL
available to existing installations; deleting a deployed worker does not remove
workers already on devices. Retain v1 payload handling for queued notifications.

Migrations 14 and 15 are additive, but preceding releases declare lower maximum
schema versions and the deployment guard will reject them after migration. Use a
tested rollback artifact that declares/supports schema 15; do not bypass the guard or delete migration
history. The publication triggers remain active even with an older binary, so
set `push_settings.enabled = 0` in the stopped database if using a rollback
binary without push configuration, and cancel its accumulated pending work
before re-enabling the new sender.

A physical-device canary and a compatible rollback rehearsal are still required
before public enablement. See the two roadmaps for the current verification record.
