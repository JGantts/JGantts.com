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
