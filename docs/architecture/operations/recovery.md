# Backup and recovery

**Responsibility:** preserve content across deployment failures and prove that backups can be restored.

**Entry points:** `content:backup`/`backup-content.ts`, release backup scripts, off-host replication, and restore-rehearsal timers.

**Dependencies:** [SQLite plus media](../server/persistence.md), filesystem permissions/capacity, restic for replication, and systemd operational alerts.

**Consumers:** release activation, operators restoring content, and periodic recovery checks.

**Invariants:** code rollback and content restoration are different operations. Quiesce all writers for a coherent database/media backup: the standalone CLI does not stop them; deployment backup does. Release archives exclude content. Rehearsals restore into isolated storage and verify the result. Backup credentials live outside application releases. Replication and rehearsal failures route to the operations webhook.

**Source:** [database backup](../../../jgantts-server/src/db/backup.ts), [CLI](../../../jgantts-server/src/cli/backup-content.ts), [backup/replication/rehearsal scripts](../../../deploy), [timer definitions](../../../deploy/systemd).

Use [content operations](../../CONTENT-OPERATIONS.md) for exact backup/restore procedures and [deployment README](../../../deploy/README.md) for timers and host configuration.

[Operations map](index.md)
