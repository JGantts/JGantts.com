# Content storage operations

The site-owned post database and media live outside deploy artifacts in
production. The Express process creates the required directories at startup.

## Configuration

Set `JGANTTS_DATA_ROOT` to an absolute or relative directory. The resolved layout
is:

```text
$JGANTTS_DATA_ROOT/
  content.sqlite
  media/
    originals/
    derived/
```

Defaults:

- Development: `jgantts-server/.data`
- Production: `/var/lib/jgantts`

Production configuration rejects a data root located inside `jgantts-server`,
because application releases must never contain persistent content. The
systemd service account needs read/write access to the configured data root;
other users should not have write access.

Set `JGANTTS_ADMIN_TOKEN` to a high-entropy secret to enable the admin API. It is
sent as an `Authorization: Bearer …` header and must exist only in server-side
configuration. When it is absent, public reads remain available and admin routes
return `503 admin_unavailable`.

The initial media API accepts JPEG, PNG, WebP, and AVIF images up to 100 MB. Alt
text is required. The original bytes are retained and 1,600 px and 480 px WebP
derivatives are generated without upscaling.

## Private post editor

Open `/admin/posts` and unlock it with `JGANTTS_ADMIN_TOKEN`. After validation,
the server keeps the sign-in in an `HttpOnly`, `Secure`, `SameSite=Strict`
cookie. Frontend JavaScript cannot read the token. The cookie persists across
reloads and browser restarts until **Log out** is clicked or the configured
admin token is rotated.

The editor can create and update drafts, preview sanitized Markdown, upload and
review images, publish locally, archive posts, inspect Mastodon state, queue a
Mastodon link post, and retry a failed syndication. Local publication and
Mastodon syndication remain separate confirmed actions. The route is omitted
from public navigation and emits `noindex, nofollow`; API authentication remains
the security boundary.

## Facebook Page syndication

Facebook is optional and disabled unless all three server-only settings are
present in `/etc/jgantts-com/jgantts-com.env`:

```text
FACEBOOK_PAGE_ID=replace-with-page-id
FACEBOOK_PAGE_ACCESS_TOKEN=replace-with-page-token
FACEBOOK_GRAPH_API_VERSION=v25.0
```

The token is never returned to the browser or written to logs. Rotate it by
issuing a replacement Page token, updating the protected environment file, and
restarting the service; revoke the old token in Meta after the restart is
healthy. Do not call a token permanent.

The editor creates one immutable Page link post for the current published
revision. Permission or validation failures are terminal; transport ambiguity
becomes `uncertain`. Use **Reconcile** before any retry. Exactly one matching
Page post is attached automatically. Zero matches enable an explicit retry;
multiple matches require selecting a candidate and using **Attach**. Local edits
never update or delete an existing Facebook post.

Endpoints require the admin session or bearer token:

```text
GET  /api/admin/posts/POST_ID/syndications/facebook
POST /api/admin/posts/POST_ID/syndications/facebook
POST /api/admin/posts/POST_ID/syndications/facebook/retry
POST /api/admin/posts/POST_ID/syndications/facebook/reconcile
POST /api/admin/posts/POST_ID/syndications/facebook/resolve
```

Keep Facebook disabled during migration and smoke tests by omitting all three
settings. This does not disable local publishing or Mastodon. Before enabling
production publication, verify the Page task, required Meta permissions, Graph
version support, token lifecycle, Sharing Debugger preview, and one canary's
stored remote ID/permalink.

### Facebook preview checklist

Before a canary, inspect the live revision URL in Meta's Sharing Debugger for:

- first and later revision URLs, redirects, and cache refresh;
- titled, titleless, and photo-only posts;
- hero images and missing-hero fallback;
- portrait and landscape renditions, dimensions, and MIME type;
- archived or unpublished content remaining inaccessible; and
- canonical URL, title/description fallbacks, crawler access, and absence of
  private image metadata.

## Mastodon syndication

Keep the Mastodon credential only in the protected systemd environment file at
`/etc/jgantts-com/jgantts-com.env`:

```text
SITE_ORIGIN=https://jgantts.com
MASTODON_BASE_URL=https://mastodon.social
MASTODON_ACCESS_TOKEN=replace-with-the-access-token
```

The token needs `write:statuses`. Add `read:statuses` when the comments phase is
enabled. The server does not need the OAuth client key or client secret after a
user access token has been issued. Restart the service after changing the file;
never print the environment or commit credentials to the repository.

Local publication and Mastodon syndication are intentionally separate. With a
published post ID and the admin bearer token, queue one canonical link post:

```sh
curl --fail-with-body --request POST \
  --header "Authorization: Bearer $JGANTTS_ADMIN_TOKEN" \
  https://jgantts.com/api/admin/posts/POST_ID/syndications/mastodon
```

To supply an explicit teaser, send JSON with one `teaser` field. Repeating the
queue request returns the existing syndication and cannot create another remote
status, even after local edits. Inspect its state with `GET` on the same URL.
Failed publication can be queued again with `POST` to the same URL plus
`/retry`.

Local edits never alter Mastodon automatically. Explicitly queue an update to
the existing remote teaser with `PATCH` and a JSON `teaser` field. Publication
and edits run through the durable SQLite outbox. The worker recovers abandoned
jobs after restart, uses a stable idempotency key, honors rate-limit delays, and
stops retrying permanent authentication or validation failures.

Published posts expose their projected Mastodon discussion at
`GET /api/posts/:slug/comments/mastodon`. Replies are normalized and sanitized
before reaching the browser. The server caches a successful context response for
two minutes and serves the cached response with `stale: true` when Mastodon is
temporarily unavailable. A response explicitly distinguishes an unsyndicated
post, an unavailable discussion, and a partial thread. Every displayed reply and
the reply action link back to Mastodon, which remains authoritative.

## Health and logs

`GET /api/health` returns a non-cacheable operational report covering SQLite,
persistent media directories, outbox backlog and failures, and Mastodon and
Facebook state independently.
Database, media, or outbox inspection failure makes the endpoint return `503`.
An old/failed Mastodon job reports `degraded` with HTTP `200`, because Mastodon
must not become a hard dependency for the canonical site.

The service writes one-line JSON logs to stdout/stderr for systemd/journald. It
records request method, path (without query values), response status, duration,
request ID, lifecycle events, outbox outcomes, and Mastodon comment failures.
It does not log request bodies, authorization headers, cookies, or tokens, and
redacts sensitive field names recursively. Inspect recent production events with:

```sh
journalctl -u jgantts-com-node-app --since "30 minutes ago" -o cat
```

## Release deployment operations

The `prod` workflow builds and tests one release bundle, verifies its checksum
before and after transfer, and installs it under
`/home/jgantts-com/node-js/releases/FULL_COMMIT_SHA`. Dependency installation,
manifest checks, native-module loading, and maps-mount checks happen while the
release is inactive. A verified content backup is mandatory before activation.

`current` selects the running release and `previous` records its predecessor.
Both are replaced atomically; application files are never copied over the live
tree. The process reads its commit identity at startup and `/api/build` must
match the basename of the resolved `current` directory.

Inspect release state without changing it:

```sh
readlink -f /home/jgantts-com/node-js/current
readlink -f /home/jgantts-com/node-js/previous
cat /home/jgantts-com/node-js/current/release-manifest.json
curl --fail-with-body https://jgantts.com/api/build
systemctl status jgantts-com-node-app
```

Activation restarts systemd and waits at most 30 seconds for `active`, then
checks health, running commit, homepage HTML, every referenced JavaScript and
CSS asset, a server-rendered post when content exists, missing-route behavior,
and fail-closed admin behavior. A failed restart or probe switches `current`
back to the preceding compatible release, restarts it, verifies it, preserves
the failed release and journal output, and still fails the workflow.

If automatic rollback fails, do not repeatedly restart. Read the deployment
result in the run's `incoming/RUN_ID-ATTEMPT/deployment-result.json`, inspect the
targeted journal output, confirm `/api/build`, and validate the database against
the intended release with:

```sh
NODE_ENV=production \
  /usr/bin/node /home/jgantts-com/node-js/releases/FULL_SHA/jgantts-server/dist/cli/check-schema-compatibility.js \
  /var/lib/jgantts
```

For emergency manual activation, choose only an installed release whose
manifest, `.artifact.sha256`, schema check, and maps link are valid. Atomically
replace `current`—never remove it first—then restart and run the same smoke test.
The repository's `activate-release.sh` implements those guards and should be
used instead of ad-hoc `ln` commands. Application rollback never rewinds
`/var/lib/jgantts`; refuse rollback when the old release's schema checker fails.

Daily maintenance compares the active manifest, reported process commit,
systemd unit, and release permissions. It retains `current`, `previous`, and
three additional newest releases, deleting only resolved SHA directories
directly beneath `releases/`. Never delete through `current`, `previous`, or a
shared link.

## Backup

Run the application-aware backup command while the service is running or
stopped. SQLite's online backup API produces a consistent database snapshot,
including when WAL mode is active, and original and derived media are copied to
the same new backup directory.

```sh
cd /home/jgantts-com/node-js/current/jgantts-server
JGANTTS_DATA_ROOT=/var/lib/jgantts npm run content:backup -- /srv/jgantts-backups/2026-09-04T120000Z
```

The destination must not already exist. Copy the resulting directory to a
different machine or storage provider; a backup on the same Linode is not a
disaster-recovery backup.

Every production site deployment stops the application for a bounded interval
so database and media writes cannot cross the snapshot boundary. It uses the
inactive release's backup tool, verifies SQLite and required media paths, and
restarts the current release before activation. Any failure stops deployment.
Snapshots are stored at:

```text
/var/lib/jgantts/backups/pre-deploy/<UTC timestamp>-<Git commit SHA>/
```

`/var/lib/jgantts/backups/pre-deploy/latest` points to the newest verified
snapshot. A daily root-owned restic job rejects stale backups and low local
capacity, rechecks SQLite, copies the verified snapshot off-host, checks the
repository, and only then applies daily/weekly/monthly retention. Failures call
the configured operations webhook. A monthly timer restores the latest off-host
snapshot into an isolated rehearsal root, verifies its database and a
representative media object, records a JSON report, and removes the temporary
restore.

## Application rollback

If content is healthy and only application code is bad, activate the recorded
`previous` release through `activate-release.sh`; rebuilding or reverting a Git
commit is unnecessary. The script checks the current database against the old
release before switching. Future migrations must follow the expand/contract
policy in `schema-compatibility.json`; destructive changes require a separately
reviewed rollout and recovery plan before merge.

## Content rollback

Content recovery is intentionally non-destructive: restore into a new root,
verify it, and then change the service configuration. Never copy a backup over
the live database.

As root, choose an exact verified backup rather than relying blindly on the
`latest` symlink:

```sh
BACKUP=/var/lib/jgantts/backups/pre-deploy/20260905T120000Z-COMMIT_SHA
RESTORE=/var/lib/jgantts-restores/20260905T123000Z

test -f "$BACKUP/content.sqlite"
test -d "$BACKUP/media/originals"
test -d "$BACKUP/media/derived"
test ! -e "$RESTORE"

install -d -o jgantts-com -g jgantts-com -m 0750 "$RESTORE"
cp --archive "$BACKUP/content.sqlite" "$RESTORE/content.sqlite"
cp --archive "$BACKUP/media" "$RESTORE/media"
chown -R jgantts-com:jgantts-com "$RESTORE"
runuser -u jgantts-com -- test -r "$RESTORE/content.sqlite"
runuser -u jgantts-com -- test -w "$RESTORE/media/originals"
```

Verify the restored database before activation:

```sh
cd /home/jgantts-com/node-js/current/jgantts-server
runuser -u jgantts-com -- node -e 'const Database = require("better-sqlite3"); const database = new Database(process.argv[1], { readonly: true }); const result = database.pragma("integrity_check", { simple: true }); database.close(); if (result !== "ok") throw new Error(`SQLite integrity check failed: ${result}`);' "$RESTORE/content.sqlite"
```

To activate it, first preserve the protected environment file, then replace the
data-root setting and restart:

```sh
ENV_BACKUP="/etc/jgantts-com/jgantts-com.env.before-content-restore.$(date -u +%Y%m%dT%H%M%SZ)"
cp --archive /etc/jgantts-com/jgantts-com.env "$ENV_BACKUP"
sed -i "s|^JGANTTS_DATA_ROOT=.*$|JGANTTS_DATA_ROOT=$RESTORE|" \
  /etc/jgantts-com/jgantts-com.env
grep -q '^JGANTTS_DATA_ROOT=' /etc/jgantts-com/jgantts-com.env || \
  printf '\nJGANTTS_DATA_ROOT=%s\n' "$RESTORE" >> /etc/jgantts-com/jgantts-com.env
systemctl restart jgantts-com-node-app
curl --fail-with-body https://jgantts.com/api/health
```

If the health check fails, restore `$ENV_BACKUP` to
`/etc/jgantts-com/jgantts-com.env` and restart the service. Keep both the former
`/var/lib/jgantts` root and the selected backup until post pages, media,
syndication state, and authoring have been checked.

## Restore rehearsal

Never restore over a running production database.

1. Stop the service or use a separate temporary data root for a rehearsal.
2. Copy the backup's `content.sqlite` and `media` directory into an empty data
   root.
3. Start the server with `JGANTTS_DATA_ROOT` pointing to that root.
4. Confirm startup applies no unexpected migration, then verify post and media
   counts and load representative original files.
5. For a real restore, switch the systemd environment to the restored root and
   restart. Retain the former data root until verification is complete.

The automated persistence test performs this process with a temporary database
and media file on every test run.
