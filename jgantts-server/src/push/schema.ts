// Publication triggers cover repository calls, imports, and older application binaries.
export const pushSchema = `
ALTER TABLE posts ADD COLUMN suppress_push INTEGER NOT NULL DEFAULT 0 CHECK (suppress_push IN (0, 1));
CREATE TABLE push_settings (id INTEGER PRIMARY KEY CHECK (id = 1), enabled INTEGER NOT NULL DEFAULT 0) STRICT;
INSERT INTO push_settings (id) VALUES (1);
CREATE TABLE push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint_hash TEXT NOT NULL UNIQUE,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT,
  credential_hash TEXT NOT NULL,
  key_version TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
) STRICT;
CREATE TABLE push_publication_events (
  id TEXT PRIMARY KEY,
  post_id TEXT UNIQUE REFERENCES posts(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'publication' CHECK (kind IN ('publication', 'test')),
  payload_json TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'expanded', 'suppressed', 'cancelled')),
  audience_max_id INTEGER NOT NULL,
  cursor_id INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
) STRICT;
CREATE TABLE push_deliveries (
  id INTEGER PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES push_publication_events(id),
  subscription_id INTEGER NOT NULL REFERENCES push_subscriptions(id),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'processing', 'accepted', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at INTEGER NOT NULL,
  lease_until INTEGER,
  lease_token TEXT,
  last_status INTEGER,
  updated_at INTEGER NOT NULL,
  UNIQUE(event_id, subscription_id)
) STRICT;
CREATE INDEX push_delivery_claim ON push_deliveries(state, available_at);
CREATE INDEX push_event_pending ON push_publication_events(state, created_at);
INSERT INTO push_publication_events (id, post_id, payload_json, state, audience_max_id, created_at, expires_at)
SELECT id, id, '{}', 'suppressed', 0, 0, 0 FROM posts
WHERE status IN ('published', 'archived') OR EXISTS (
  SELECT 1 FROM post_revisions WHERE post_id = posts.id AND status = 'published'
);
${['INSERT', 'UPDATE OF status'].map(operation => `
CREATE TRIGGER push_first_publication_${operation === 'INSERT' ? 'insert' : 'update'}
AFTER ${operation} ON posts WHEN NEW.status = 'published'
BEGIN
  INSERT OR IGNORE INTO push_publication_events
    (id, post_id, payload_json, state, audience_max_id, created_at, expires_at)
  VALUES (NEW.id, NEW.id,
    json_object('title', NEW.title, 'excerpt', NEW.excerpt, 'bodyHtml', substr(NEW.body_html, 1, 2000),
      'contentWarning', NEW.content_warning, 'slug', NEW.slug),
    CASE WHEN ${operation === 'INSERT' ? '1' : 'NEW.suppress_push'} = 1 OR (SELECT enabled FROM push_settings WHERE id = 1) = 0
      THEN 'suppressed' ELSE 'pending' END,
    COALESCE((SELECT MAX(id) FROM push_subscriptions), 0),
    unixepoch() * 1000, (unixepoch() + 86400) * 1000);
END;
`).join('\n')}
CREATE TRIGGER push_cancel_unpublished AFTER UPDATE OF status ON posts WHEN NEW.status != 'published'
BEGIN
  UPDATE push_publication_events SET state = 'cancelled' WHERE post_id = NEW.id AND state IN ('pending', 'expanded');
  UPDATE push_deliveries SET state = 'cancelled', lease_token = NULL
  WHERE event_id = NEW.id AND state IN ('pending', 'processing');
END;
`;

// Preserve integer queue ordering while giving installations an opaque public ID.
const installationUuid = `lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) ||
  '-4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', (random() & 3) + 1, 1) || substr(lower(hex(randomblob(2))), 2) ||
  '-' || lower(hex(randomblob(6)))`;
export const pushInstallationIdsSchema = `
ALTER TABLE push_subscriptions ADD COLUMN installation_id TEXT NOT NULL DEFAULT '';
UPDATE push_subscriptions SET installation_id = ${installationUuid};
CREATE UNIQUE INDEX push_installation_id ON push_subscriptions(installation_id) WHERE installation_id != '';
CREATE TRIGGER push_installation_id_insert AFTER INSERT ON push_subscriptions
WHEN NEW.installation_id = '' BEGIN
  UPDATE push_subscriptions SET installation_id = ${installationUuid} WHERE id = NEW.id;
END;
`;

export const pushLimitsSchema = `
ALTER TABLE push_subscriptions ADD COLUMN max_per_day INTEGER DEFAULT 2 CHECK (max_per_day BETWEEN 0 AND 1000);
ALTER TABLE push_subscriptions ADD COLUMN max_per_week INTEGER DEFAULT 3 CHECK (max_per_week BETWEEN 0 AND 1000);
ALTER TABLE push_deliveries ADD COLUMN skip_reason TEXT CHECK (skip_reason IN ('daily_limit', 'weekly_limit'));
CREATE INDEX push_delivery_frequency ON push_deliveries(subscription_id, state, updated_at);
`;
