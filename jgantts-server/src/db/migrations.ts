import type Database from 'better-sqlite3';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: 'initial_content_schema',
    sql: `
      CREATE TABLE posts (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        body_markdown TEXT NOT NULL,
        body_html TEXT NOT NULL,
        excerpt TEXT,
        content_warning TEXT,
        status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
        hero_media_id TEXT REFERENCES media(id) DEFERRABLE INITIALLY DEFERRED,
        created_at TEXT NOT NULL,
        published_at TEXT,
        updated_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE post_revisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        revision_number INTEGER NOT NULL,
        slug TEXT NOT NULL,
        body_markdown TEXT NOT NULL,
        body_html TEXT NOT NULL,
        excerpt TEXT,
        content_warning TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (post_id, revision_number)
      ) STRICT;

      CREATE TABLE slug_redirects (
        slug TEXT PRIMARY KEY,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE media (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        original_path TEXT NOT NULL UNIQUE,
        derived_json TEXT NOT NULL DEFAULT '{}',
        mime_type TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
        checksum_sha256 TEXT NOT NULL,
        alt_text TEXT NOT NULL DEFAULT '',
        focal_x REAL,
        focal_y REAL,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE INDEX media_post_order_idx ON media(post_id, display_order, id);

      CREATE TABLE syndications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        destination TEXT NOT NULL,
        remote_instance TEXT NOT NULL,
        remote_status_id TEXT,
        remote_url TEXT,
        state TEXT NOT NULL CHECK (state IN ('pending', 'published', 'failed')),
        publication_revision INTEGER NOT NULL DEFAULT 1,
        idempotency_key TEXT NOT NULL UNIQUE,
        attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (post_id, destination, publication_revision)
      ) STRICT;

      CREATE TABLE outbox_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('pending', 'processing', 'completed', 'failed')),
        attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        available_at TEXT NOT NULL,
        locked_at TEXT,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;

      CREATE INDEX outbox_claim_idx ON outbox_jobs(state, available_at, id);

      CREATE TABLE mastodon_comment_cache (
        post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
        remote_instance TEXT NOT NULL,
        root_status_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      ) STRICT;
    `,
  },
];

export function migrateDatabase(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT;
  `);

  const appliedVersions = new Set(
    database.prepare('SELECT version FROM schema_migrations').all()
      .map((row) => (row as { version: number }).version),
  );
  const apply = database.transaction((migration: Migration) => {
    database.exec(migration.sql);
    database.prepare(`
      INSERT INTO schema_migrations (version, name, applied_at)
      VALUES (?, ?, ?)
    `).run(migration.version, migration.name, new Date().toISOString());
  });

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) apply(migration);
  }
}
