import { createHash } from 'node:crypto';
import type { ContentDatabase } from '../db/database';
import { inTransaction } from '../db/database';
import type { SyndicationDestination, SyndicationJobKind, MastodonJobPayload, OutboxJob, Syndication } from './types';

interface SyndicationRow {
  id: number;
  post_id: string;
  destination: string;
  remote_instance: string;
  remote_status_id: string | null;
  remote_url: string | null;
  state: Syndication['state'];
  publication_revision: number;
  idempotency_key: string;
  attempt_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

interface OutboxRow {
  id: number;
  kind: SyndicationJobKind;
  aggregate_id: string;
  payload_json: string;
  state: OutboxJob['state'];
  attempt_count: number;
  available_at: string;
  locked_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

function mapSyndication(row: SyndicationRow): Syndication {
  return {
    id: row.id,
    postId: row.post_id,
    destination: row.destination as SyndicationDestination,
    remoteInstance: row.remote_instance,
    remoteStatusId: row.remote_status_id,
    remoteUrl: row.remote_url,
    state: row.state,
    publicationRevision: row.publication_revision,
    idempotencyKey: row.idempotency_key,
    attemptCount: row.attempt_count,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapJob(row: OutboxRow): OutboxJob {
  return {
    id: row.id,
    kind: row.kind,
    aggregateId: row.aggregate_id,
    payload: JSON.parse(row.payload_json) as MastodonJobPayload,
    state: row.state,
    attemptCount: row.attempt_count,
    availableAt: row.available_at,
    lockedAt: row.locked_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function idempotencyKey(destination: SyndicationDestination, postId: string, revision: number): string {
  return createHash('sha256').update(`jgantts:${destination}:${postId}:${revision}`).digest('hex');
}

export class SyndicationRepository {
  constructor(private readonly database: ContentDatabase) {}

  getById(id: number): Syndication | null {
    const row = this.database.prepare('SELECT * FROM syndications WHERE id = ?').get(id) as SyndicationRow | undefined;
    return row ? mapSyndication(row) : null;
  }

  getPublicationPayload(syndicationId: number): { canonicalUrl: string; teaser: string } | null {
    const row = this.database.prepare("SELECT payload_json FROM outbox_jobs WHERE aggregate_id = ? AND kind = 'facebook.publish_link' ORDER BY id DESC LIMIT 1").get(String(syndicationId)) as { payload_json: string } | undefined;
    if (!row) return null;
    const payload = JSON.parse(row.payload_json) as { canonicalUrl?: string; teaser?: string };
    return payload.canonicalUrl && payload.teaser ? { canonicalUrl: payload.canonicalUrl, teaser: payload.teaser } : null;
  }

  attachRemote(syndicationId: number, remote: { id: string; url: string }, now = new Date().toISOString()): Syndication {
    this.database.prepare("UPDATE syndications SET state = 'published', remote_status_id = ?, remote_url = ?, last_error = NULL, updated_at = ? WHERE id = ? AND destination = 'facebook'").run(remote.id, remote.url, now, syndicationId);
    this.database.prepare("UPDATE publication_history SET state = 'published', remote_status_id = ?, remote_url = ?, updated_at = ? WHERE post_id = (SELECT post_id FROM syndications WHERE id = ?) AND destination = 'facebook' AND publication_revision = (SELECT publication_revision FROM syndications WHERE id = ?)").run(remote.id, remote.url, now, syndicationId, syndicationId);
    return this.getById(syndicationId) as Syndication;
  }

  resolveRemote(syndicationId: number, remote: { id: string; url: string }, now = new Date().toISOString()): Syndication {
    const item = this.getById(syndicationId);
    if (!item || item.destination !== 'facebook' || item.state !== 'uncertain') throw Object.assign(new Error('Only an uncertain Facebook publication can be resolved.'), { status: 409 });
    return this.attachRemote(syndicationId, remote, now);
  }

  markNoMatch(syndicationId: number, now = new Date().toISOString()): Syndication {
    this.database.prepare("UPDATE syndications SET last_error = 'Reconciliation found no matching Facebook post; explicit retry is allowed.', updated_at = ? WHERE id = ? AND destination = 'facebook' AND state = 'uncertain'").run(now, syndicationId);
    return this.getById(syndicationId) as Syndication;
  }

  getLatestForPost(postId: string, destination: SyndicationDestination = 'mastodon'): Syndication | null {
    const row = this.database.prepare(`
      SELECT * FROM syndications
      WHERE post_id = ? AND destination = ?
      ORDER BY publication_revision DESC, id DESC LIMIT 1
    `).get(postId, destination) as SyndicationRow | undefined;
    return row ? mapSyndication(row) : null;
  }

  listForPost(postId: string): Syndication[] {
    return (this.database.prepare(`SELECT * FROM syndications WHERE post_id = ? ORDER BY publication_revision DESC, id DESC`)
      .all(postId) as SyndicationRow[]).map(mapSyndication);
  }

  listPublicationHistory(postId: string): Array<{ revision: number; destination: string; state: string; remoteStatusId: string | null; remoteUrl: string | null; createdAt: string; updatedAt: string }> {
    return this.database.prepare(`
    SELECT publication_revision AS revision, destination, state, remote_status_id AS remoteStatusId,
        remote_url AS remoteUrl, created_at AS createdAt, updated_at AS updatedAt
      FROM publication_history WHERE post_id = ?
      ORDER BY publication_revision DESC, id DESC
    `).all(postId) as Array<{ revision: number; destination: string; state: string; remoteStatusId: string | null; remoteUrl: string | null; createdAt: string; updatedAt: string }>;
  }

  queuePublication(input: {
    canonicalUrl: string;
    postId: string;
    remoteInstance: string;
    teaser: string;
    destination?: SyndicationDestination;
  }, now = new Date().toISOString()): { queued: boolean; syndication: Syndication } {
    return inTransaction(this.database, () => {
      const post = this.database.prepare(`
        SELECT status, (SELECT MAX(revision_number) FROM post_revisions WHERE post_id = posts.id) AS revision
        FROM posts WHERE id = ?
      `).get(input.postId) as { revision: number; status: string } | undefined;
      if (!post) throw Object.assign(new Error('Post not found.'), { status: 404 });
      if (post.status !== 'published') {
        throw Object.assign(new Error('Only published posts can be syndicated.'), { status: 409 });
      }

      const destination = input.destination ?? 'mastodon';
      const existingRow = this.database.prepare(`
        SELECT * FROM syndications
        WHERE post_id = ? AND destination = ?
        ORDER BY publication_revision DESC, id DESC LIMIT 1
      `).get(input.postId, destination) as SyndicationRow | undefined;
      if (existingRow) return { queued: false, syndication: mapSyndication(existingRow) };

      const key = idempotencyKey(destination, input.postId, post.revision);
      const result = this.database.prepare(`
        INSERT INTO syndications (
          post_id, destination, remote_instance, state, publication_revision,
          idempotency_key, created_at, updated_at
        ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
      `).run(input.postId, destination, input.remoteInstance, post.revision, key, now, now);
      const syndicationId = Number(result.lastInsertRowid);
      this.database.prepare(`INSERT INTO publication_history (post_id, destination, publication_revision, state, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?)`)
        .run(input.postId, destination, post.revision, now, now);
      if (destination === 'mastodon') this.database.prepare(`INSERT INTO mastodon_publication_history (post_id, publication_revision, state, created_at, updated_at) VALUES (?, ?, 'pending', ?, ?)`).run(input.postId, post.revision, now, now);
      this.insertJob(destination === 'facebook' ? 'facebook.publish_link' : 'mastodon.publish_status', syndicationId, {
        canonicalUrl: input.canonicalUrl,
        idempotencyKey: key,
        syndicationId,
        teaser: input.teaser,
      }, now);
      return { queued: true, syndication: this.getById(syndicationId) as Syndication };
    });
  }

  queueEdit(syndicationId: number, payload: Omit<MastodonJobPayload, 'syndicationId'>, now = new Date().toISOString()): OutboxJob {
    return inTransaction(this.database, () => {
      const syndication = this.getById(syndicationId);
      if (!syndication?.remoteStatusId || syndication.state !== 'published') {
        throw Object.assign(new Error('A published Mastodon status is required before editing.'), { status: 409 });
      }
      const active = this.database.prepare(`
        SELECT * FROM outbox_jobs
        WHERE aggregate_id = ? AND kind = 'mastodon.edit_status' AND state IN ('pending', 'processing')
        ORDER BY id DESC LIMIT 1
      `).get(String(syndicationId)) as OutboxRow | undefined;
      if (active) {
        const activeJob = mapJob(active);
        if (activeJob.payload.idempotencyKey === payload.idempotencyKey) return activeJob;
        throw Object.assign(new Error('A different Mastodon teaser edit is already queued.'), { status: 409 });
      }
      const job = this.insertJob('mastodon.edit_status', syndicationId, {
        ...payload,
        syndicationId,
      }, now);
      const revision = this.database.prepare(`
        SELECT s.post_id AS post_id,
          COALESCE((SELECT MAX(revision_number) FROM post_revisions WHERE post_id = s.post_id AND status = 'published'), s.publication_revision) AS publication_revision
        FROM syndications s WHERE s.id = ?
      `).get(syndicationId) as { publication_revision: number; post_id: string };
      this.database.prepare(`INSERT INTO publication_history (post_id, destination, publication_revision, state, created_at, updated_at) VALUES (?, 'mastodon', ?, 'pending', ?, ?)`)
        .run(revision.post_id, revision.publication_revision, now, now);
      this.database.prepare(`INSERT INTO mastodon_publication_history (post_id, publication_revision, state, created_at, updated_at) VALUES (?, ?, 'pending', ?, ?)`).run(revision.post_id, revision.publication_revision, now, now);
      return job;
    });
  }

  claimNext(now = new Date(), staleAfterMs = 5 * 60_000): OutboxJob | null {
    return inTransaction(this.database, () => {
      const nowIso = now.toISOString();
      const staleIso = new Date(now.getTime() - staleAfterMs).toISOString();
      const row = this.database.prepare(`
        SELECT * FROM outbox_jobs
        WHERE (state = 'pending' AND available_at <= ?)
           OR (state = 'processing' AND locked_at <= ?)
        ORDER BY available_at, id LIMIT 1
      `).get(nowIso, staleIso) as OutboxRow | undefined;
      if (!row) return null;
      this.database.prepare(`
        UPDATE outbox_jobs SET state = 'processing', attempt_count = attempt_count + 1,
          locked_at = ?, updated_at = ? WHERE id = ?
      `).run(nowIso, nowIso, row.id);
      this.database.prepare(`
        UPDATE syndications SET attempt_count = attempt_count + 1, updated_at = ? WHERE id = ?
      `).run(nowIso, Number(row.aggregate_id));
      const claimed = this.database.prepare('SELECT * FROM outbox_jobs WHERE id = ?').get(row.id) as OutboxRow;
      return mapJob(claimed);
    });
  }

  completePublication(job: OutboxJob, remote: { id: string; url: string }, now = new Date().toISOString()): void {
    inTransaction(this.database, () => {
      this.completeJob(job.id, now);
      this.database.prepare(`
        UPDATE syndications SET state = 'published', remote_status_id = ?, remote_url = ?,
          last_error = NULL, updated_at = ? WHERE id = ?
      `).run(remote.id, remote.url, now, job.payload.syndicationId);
      this.database.prepare(`UPDATE publication_history SET state = 'published', remote_status_id = ?, remote_url = ?, updated_at = ? WHERE id = (SELECT id FROM publication_history WHERE post_id = (SELECT post_id FROM syndications WHERE id = ?) AND destination = (SELECT destination FROM syndications WHERE id = ?) ORDER BY id DESC LIMIT 1)`)
        .run(remote.id, remote.url, now, job.payload.syndicationId, job.payload.syndicationId);
    });
  }

  completeEdit(job: OutboxJob, remote: { id: string; url: string }, now = new Date().toISOString()): void {
    inTransaction(this.database, () => {
      this.completeJob(job.id, now);
      this.database.prepare(`
        UPDATE syndications SET remote_status_id = ?, remote_url = ?, last_error = NULL, updated_at = ?
        WHERE id = ?
      `).run(remote.id, remote.url, now, job.payload.syndicationId);
      this.database.prepare(`UPDATE publication_history SET state = 'published', remote_status_id = ?, remote_url = ?, updated_at = ? WHERE id = (SELECT id FROM publication_history WHERE post_id = (SELECT post_id FROM syndications WHERE id = ?) AND destination = (SELECT destination FROM syndications WHERE id = ?) ORDER BY id DESC LIMIT 1)`)
        .run(remote.id, remote.url, now, job.payload.syndicationId, job.payload.syndicationId);
    });
  }

  reschedule(job: OutboxJob, error: string, availableAt: Date, now = new Date().toISOString()): void {
    inTransaction(this.database, () => {
      this.database.prepare(`
        UPDATE outbox_jobs SET state = 'pending', available_at = ?, locked_at = NULL,
          last_error = ?, updated_at = ? WHERE id = ?
      `).run(availableAt.toISOString(), error, now, job.id);
      this.database.prepare(`
        UPDATE syndications SET last_error = ?, updated_at = ? WHERE id = ?
      `).run(error, now, job.payload.syndicationId);
    });
  }

  fail(job: OutboxJob, error: string, now = new Date().toISOString()): void {
    inTransaction(this.database, () => {
      this.database.prepare(`
        UPDATE outbox_jobs SET state = 'failed', locked_at = NULL, last_error = ?, updated_at = ? WHERE id = ?
      `).run(error, now, job.id);
      if (job.kind === 'mastodon.publish_status') {
        this.database.prepare(`
          UPDATE syndications SET state = 'failed', last_error = ?, updated_at = ? WHERE id = ?
        `).run(error, now, job.payload.syndicationId);
      } else {
        this.database.prepare(`
          UPDATE syndications SET last_error = ?, updated_at = ? WHERE id = ?
        `).run(error, now, job.payload.syndicationId);
      }
      this.database.prepare(`UPDATE publication_history SET state = 'failed', updated_at = ? WHERE id = (SELECT id FROM publication_history WHERE post_id = (SELECT post_id FROM syndications WHERE id = ?) AND destination = (SELECT destination FROM syndications WHERE id = ?) ORDER BY id DESC LIMIT 1)`)
        .run(now, job.payload.syndicationId, job.payload.syndicationId);
    });
  }

  markUncertain(job: OutboxJob, error: string, now = new Date().toISOString()): void {
    inTransaction(this.database, () => {
      this.database.prepare("UPDATE outbox_jobs SET state = 'failed', locked_at = NULL, last_error = ?, updated_at = ? WHERE id = ?").run(error, now, job.id);
      this.database.prepare("UPDATE syndications SET state = 'uncertain', last_error = ?, updated_at = ? WHERE id = ?").run(error, now, job.payload.syndicationId);
    });
  }

  retry(syndicationId: number, now = new Date().toISOString()): Syndication {
    return inTransaction(this.database, () => {
      const syndication = this.getById(syndicationId);
      if (!syndication || (syndication.state !== 'failed' && !(syndication.destination === 'facebook' && syndication.state === 'uncertain' && syndication.lastError?.startsWith('Reconciliation found no matching')))) {
        throw Object.assign(new Error(`Only failed ${syndication?.destination ?? 'syndication'} publications can be retried.`), { status: 409 });
      }
      const job = this.database.prepare(`
        SELECT * FROM outbox_jobs WHERE aggregate_id = ? AND kind = 'mastodon.publish_status'
        ORDER BY id DESC LIMIT 1
      `).get(String(syndicationId)) as OutboxRow | undefined;
      if (!job) throw new Error('The failed syndication has no publication job.');
      this.database.prepare(`
        UPDATE outbox_jobs SET state = 'pending', attempt_count = 0, available_at = ?, locked_at = NULL,
          last_error = NULL, updated_at = ? WHERE id = ?
      `).run(now, now, job.id);
      this.database.prepare(`
        UPDATE syndications SET state = 'pending', attempt_count = 0, last_error = NULL, updated_at = ? WHERE id = ?
      `).run(now, syndicationId);
      return this.getById(syndicationId) as Syndication;
    });
  }

  private insertJob(kind: SyndicationJobKind, syndicationId: number, payload: MastodonJobPayload, now: string): OutboxJob {
    const result = this.database.prepare(`
      INSERT INTO outbox_jobs (
        kind, aggregate_id, payload_json, state, available_at, created_at, updated_at
      ) VALUES (?, ?, ?, 'pending', ?, ?, ?)
    `).run(kind, String(syndicationId), JSON.stringify(payload), now, now, now);
    const row = this.database.prepare('SELECT * FROM outbox_jobs WHERE id = ?').get(result.lastInsertRowid) as OutboxRow;
    return mapJob(row);
  }

  private completeJob(jobId: number, now: string): void {
    this.database.prepare(`
      UPDATE outbox_jobs SET state = 'completed', locked_at = NULL, last_error = NULL, updated_at = ? WHERE id = ?
    `).run(now, jobId);
  }
}
