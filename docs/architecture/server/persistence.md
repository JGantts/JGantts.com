# Content persistence

**Responsibility:** store authoritative content and durable integration state independently of application releases.

**Entry points:** `openContentDatabase` enables foreign keys, WAL for disk databases, and migrations; the read-only opener does not migrate. Domain repositories own SQL. `ensureMediaDirectories` creates originals, derived, and social directories.

**Dependencies:** better-sqlite3, ordered migrations, filesystem paths from runtime configuration.

**Consumers:** posts/revisions, media, social previews, syndication/outbox, comment cache, health, backup and schema-check CLIs.

**Invariants:** production `JGANTTS_DATA_ROOT` must be outside the deployment tree (default `/var/lib/jgantts`); development defaults to `jgantts-server/.data`. SQLite and media files together form content state. Preserve transaction boundaries and update schema compatibility declarations when changing migrations. Release rollback does not automatically undo data migrations.

**Source:** [database and migrations](../../../jgantts-server/src/db), [storage directories](../../../jgantts-server/src/storage.ts), [schema compatibility](../../../jgantts-server/schema-compatibility.json), [schema checker](../../../jgantts-server/src/cli/check-schema-compatibility.ts).

Follow [recovery](../operations/recovery.md) for backup procedures and [server map](index.md) for repository consumers.
