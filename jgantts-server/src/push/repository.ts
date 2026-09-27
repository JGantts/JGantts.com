import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import type { PushAudience } from './config';
import type { ContentDatabase } from '../db/database';
import type { Subscription } from './subscription';
import { pushError } from './subscription';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export interface PushDelivery {
  id: number; event_id: string; subscription_id: number; attempts: number; lease_token: string;
  payload_json: string; expires_at: number; endpoint: string; p256dh: string; auth: string; key_version: string;
}
export class PushRepository {
  constructor(readonly db: ContentDatabase) {}
  setEnrollment(enabled: boolean) { this.db.prepare('UPDATE push_settings SET enabled = ? WHERE id = 1').run(Number(enabled)); }
  resolveId(id: string | number): number | undefined {
    return (this.db.prepare(typeof id === 'number'
      ? 'SELECT id FROM push_subscriptions WHERE id = ?'
      : 'SELECT id FROM push_subscriptions WHERE installation_id = ?')
      .get(id) as { id: number } | undefined)?.id;
  }
  allows(id: string | number, audience: PushAudience): boolean {
    const internalId = this.resolveId(id);
    return internalId !== undefined && (audience === '*' || audience.some(candidate => this.resolveId(candidate) === internalId));
  }
  register(subscription: Subscription, credential: string, version: string, now = Date.now()) {
    return this.db.transaction(() => {
      const endpointHash = hash(subscription.endpoint);
      const existing = this.db.prepare('SELECT id, installation_id, credential_hash, active, key_version, p256dh, auth FROM push_subscriptions WHERE endpoint_hash = ?').get(endpointHash) as { id: number; installation_id: string; credential_hash: string; active: number; key_version: string; p256dh: string; auth: string } | undefined;
      if (existing) {
        if (!timingSafeEqual(Buffer.from(existing.credential_hash), Buffer.from(hash(credential)))) throw pushError(409, 'Reset the browser subscription to reconnect this installation.');
        if (existing.key_version !== version) throw pushError(409, 'Reset this installation to use the updated notification key.');
        if (!existing.active) throw pushError(409, 'This subscription was revoked. Create a new browser subscription.');
        // Browsers can renew encryption material while retaining an endpoint.
        // Only its authenticated owner may refresh it; keep the audience cutoff
        // identity and signing-key version unchanged.
        this.db.prepare('UPDATE push_subscriptions SET p256dh = ?, auth = ?, last_seen_at = ? WHERE id = ?')
          .run(subscription.keys.p256dh, subscription.keys.auth, now, existing.id);
        if (existing.p256dh !== subscription.keys.p256dh || existing.auth !== subscription.keys.auth) {
          // Reclaim prepared work so its final consent/lease check rejects stale
          // encryption keys. Already accepted deliveries are never replayed.
          this.db.prepare(`UPDATE push_deliveries SET state = 'pending', lease_token = NULL,
            lease_until = NULL, available_at = ?, updated_at = ?
            WHERE subscription_id = ? AND state = 'processing'`).run(now, now, existing.id);
        }
        return { id: existing.installation_id };
      }
      const id = randomUUID();
      this.db.prepare(`INSERT INTO push_subscriptions
        (installation_id, endpoint_hash, endpoint, p256dh, auth, credential_hash, key_version, created_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, endpointHash, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, hash(credential), version, now, now);
      return { id };
    })();
  }
  revokeEndpoint(endpoint: string, credential: string) {
    const row = this.db.prepare('SELECT id FROM push_subscriptions WHERE endpoint_hash = ?').get(hash(endpoint)) as { id: number } | undefined;
    if (row) this.revoke(row.id, credential);
  }
  revoke(installationId: string | number, credential: string) {
    const id = this.resolveId(installationId);
    if (id === undefined) throw pushError(404, 'Installation not found.');
    const row = this.db.prepare('SELECT credential_hash FROM push_subscriptions WHERE id = ?').get(id) as { credential_hash: string } | undefined;
    if (!row || !timingSafeEqual(Buffer.from(row.credential_hash), Buffer.from(hash(credential)))) throw pushError(404, 'Installation not found.');
    this.disable(id);
  }
  disable(id: number) {
    this.db.transaction(() => {
      this.db.prepare('UPDATE push_subscriptions SET active = 0, endpoint = NULL, p256dh = NULL, auth = NULL WHERE id = ?').run(id);
      this.db.prepare("UPDATE push_deliveries SET state = 'cancelled', lease_token = NULL WHERE subscription_id = ? AND state IN ('pending', 'processing')").run(id);
    })();
  }
  enqueueTest(installationId: string | number, now = Date.now()) {
    const id = this.resolveId(installationId);
    if (id === undefined) throw pushError(404, 'Active canary installation not found.');
    if (!this.db.prepare('SELECT id FROM push_subscriptions WHERE id = ? AND active = 1').get(id)) throw pushError(404, 'Active canary installation not found.');
    const event = `test-${randomUUID()}`;
    this.db.transaction(() => {
      this.db.prepare(`INSERT INTO push_publication_events (id, kind, payload_json, state, audience_max_id, created_at, expires_at)
        VALUES (?, 'test', ?, 'expanded', ?, ?, ?)`).run(event, JSON.stringify({ test: true }), id, now, now + 3600_000);
      this.db.prepare('INSERT INTO push_deliveries (event_id, subscription_id, available_at, updated_at) VALUES (?, ?, ?, ?)').run(event, id, now, now);
    })();
    return event;
  }
  maintain(now = Date.now()) {
    this.db.transaction(() => {
      this.db.prepare(`UPDATE push_deliveries SET state = 'cancelled', lease_token = NULL WHERE state IN ('pending', 'processing') AND event_id IN (
        SELECT id FROM push_publication_events WHERE expires_at <= ? OR state IN ('suppressed', 'cancelled')
        OR (kind != 'test' AND NOT EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND status = 'published'))
      )`).run(now);
      this.db.prepare("UPDATE push_publication_events SET state = 'cancelled' WHERE state = 'pending' AND expires_at <= ?").run(now);
      this.db.prepare("DELETE FROM push_deliveries WHERE state IN ('accepted', 'failed', 'cancelled') AND updated_at < ?").run(now - 30 * 86400_000);
      this.db.prepare("UPDATE push_publication_events SET payload_json = '{}' WHERE expires_at < ?").run(now - 30 * 86400_000);
      this.db.prepare("DELETE FROM push_publication_events WHERE kind = 'test' AND expires_at < ? AND NOT EXISTS (SELECT 1 FROM push_deliveries WHERE event_id = push_publication_events.id)").run(now - 30 * 86400_000);
    })();
  }
  fanOut(now = Date.now(), batch = 100) {
    return this.db.transaction(() => {
      const event = this.db.prepare("SELECT * FROM push_publication_events WHERE state = 'pending' AND expires_at > ? ORDER BY created_at, id LIMIT 1").get(now) as { id: string; audience_max_id: number; cursor_id: number } | undefined;
      if (!event) return false;
      const recipients = this.db.prepare('SELECT id FROM push_subscriptions WHERE active = 1 AND id > ? AND id <= ? ORDER BY id LIMIT ?').all(event.cursor_id, event.audience_max_id, batch) as { id: number }[];
      const insert = this.db.prepare('INSERT OR IGNORE INTO push_deliveries (event_id, subscription_id, available_at, updated_at) VALUES (?, ?, ?, ?)');
      for (const recipient of recipients) insert.run(event.id, recipient.id, now, now);
      this.db.prepare('UPDATE push_publication_events SET cursor_id = ?, state = ? WHERE id = ?')
        .run(recipients.at(-1)?.id ?? event.cursor_id, recipients.length < batch ? 'expanded' : 'pending', event.id);
      return true;
    })();
  }
  claim(audience: PushAudience, now = Date.now()): PushDelivery | null {
    if (audience !== '*' && !audience.length) return null;
    return this.db.transaction(() => {
      const allowed = audience === '*' ? '' : `AND s.id IN (${audience.map(() => '?').join(',')})`;
      const row = this.db.prepare(`SELECT d.id FROM push_deliveries d JOIN push_subscriptions s ON s.id = d.subscription_id
        JOIN push_publication_events e ON e.id = d.event_id
        WHERE s.active = 1 AND e.expires_at > ? AND e.state IN ('pending', 'expanded')
        AND (e.kind = 'test' OR EXISTS (SELECT 1 FROM posts WHERE id = e.post_id AND status = 'published'))
        AND ((d.state = 'pending' AND d.available_at <= ?) OR (d.state = 'processing' AND d.lease_until <= ?))
        ${allowed} ORDER BY d.available_at, d.id LIMIT 1`).get(now, now, now, ...(audience === '*' ? [] : audience.map(id => this.resolveId(id) ?? -1))) as { id: number } | undefined;
      if (!row) return null;
      const token = randomUUID();
      this.db.prepare("UPDATE push_deliveries SET state = 'processing', attempts = attempts + 1, lease_token = ?, lease_until = ?, updated_at = ? WHERE id = ?").run(token, now + 60_000, now, row.id);
      return this.current(row.id, token, now);
    })();
  }
  current(id: number, token: string, now = Date.now()): PushDelivery | null {
    return this.db.prepare(`SELECT d.*, e.payload_json, e.expires_at, s.endpoint, s.p256dh, s.auth, s.key_version
      FROM push_deliveries d JOIN push_publication_events e ON e.id = d.event_id JOIN push_subscriptions s ON s.id = d.subscription_id
      WHERE d.id = ? AND d.lease_token = ? AND d.state = 'processing' AND s.active = 1 AND e.expires_at > ? AND d.lease_until > ?
      AND e.state IN ('pending', 'expanded')
      AND (e.kind = 'test' OR EXISTS (SELECT 1 FROM posts WHERE id = e.post_id AND status = 'published'))`).get(id, token, now, now) as PushDelivery | undefined ?? null;
  }
  finish(job: PushDelivery, state: 'accepted' | 'failed' | 'pending' | 'cancelled', status: number | null, next = Date.now()) {
    this.db.prepare(`UPDATE push_deliveries SET state = ?, last_status = ?, available_at = ?, updated_at = ?, lease_token = NULL, lease_until = NULL
      WHERE id = ? AND lease_token = ? AND state = 'processing'`).run(state, status, next, Date.now(), job.id, job.lease_token);
  }
  status(now = Date.now()) {
    const active = this.db.prepare('SELECT COUNT(*) AS count FROM push_subscriptions WHERE active = 1').get() as { count: number };
    const states = this.db.prepare('SELECT state, COUNT(*) AS count FROM push_deliveries GROUP BY state').all();
    const oldest = this.db.prepare("SELECT MIN(available_at) AS value FROM push_deliveries WHERE state IN ('pending', 'processing')").get() as { value: number | null };
    const retries = this.db.prepare("SELECT COUNT(*) AS count FROM push_deliveries WHERE state = 'pending' AND attempts > 0").get() as { count: number };
    const keyVersions = this.db.prepare('SELECT key_version AS version, COUNT(*) AS count FROM push_subscriptions WHERE active = 1 GROUP BY key_version').all();
    return { keyVersions, activeSubscriptions: active.count, retryingDeliveries: retries.count, deliveries: states, oldestPendingAgeSeconds: oldest.value === null ? 0 : Math.max(0, Math.floor((now - oldest.value) / 1000)) };
  }
}
