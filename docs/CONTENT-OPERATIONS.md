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
because the current deployment replaces files in that application tree. The
systemd service account needs read/write access to the configured data root;
other users should not have write access.

Set `JGANTTS_ADMIN_TOKEN` to a high-entropy secret to enable the admin API. It is
sent as an `Authorization: Bearer …` header and must exist only in server-side
configuration. When it is absent, public reads remain available and admin routes
return `503 admin_unavailable`.

The initial media API accepts JPEG, PNG, WebP, and AVIF images up to 25 MB. Alt
text is required. The original bytes are retained and 1,600 px and 480 px WebP
derivatives are generated without upscaling.

## Private post editor

Open `/admin/posts` and unlock it with `JGANTTS_ADMIN_TOKEN`. The token is kept
only in page memory: it is not bundled into the frontend, written to browser
storage, or retained after a reload, lock action, or navigation away from the
editor.

The editor can create and update drafts, preview sanitized Markdown, upload and
review images, publish locally, archive posts, inspect Mastodon state, queue a
Mastodon link post, and retry a failed syndication. Local publication and
Mastodon syndication remain separate confirmed actions. The route is omitted
from public navigation and emits `noindex, nofollow`; API authentication remains
the security boundary.

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

## Backup

Run the application-aware backup command while the service is running or
stopped. SQLite's online backup API produces a consistent database snapshot,
including when WAL mode is active, and original and derived media are copied to
the same new backup directory.

```sh
cd /home/jgantts-com/node-js/jgantts-server
JGANTTS_DATA_ROOT=/var/lib/jgantts npm run content:backup -- /srv/jgantts-backups/2026-09-04T120000Z
```

The destination must not already exist. Copy the resulting directory to a
different machine or storage provider; a backup on the same Linode is not a
disaster-recovery backup.

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
