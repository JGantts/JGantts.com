import fs from 'node:fs';
import path from 'node:path';
import type { ContentDatabase } from '../db/database';

export interface HealthReport {
  checks: {
    database: { status: 'ok' | 'unhealthy' };
    mastodon: { configured: boolean; status: 'ok' | 'disabled' | 'degraded' };
    media: { status: 'ok' | 'unhealthy' };
    outbox: {
      failed: number;
      oldestPendingAt: string | null;
      pending: number;
      processing: number;
      status: 'ok' | 'degraded' | 'unhealthy';
    };
  };
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
}

interface OutboxCounts {
  failed: number;
  oldest_pending_at: string | null;
  pending: number;
  processing: number;
  stale_processing: number;
}

const BACKLOG_DEGRADED_AFTER_MS = 10 * 60_000;
const PROCESSING_STALE_AFTER_MS = 5 * 60_000;

export class HealthService {
  constructor(
    private readonly database: ContentDatabase,
    private readonly mediaRoot: string,
    private readonly mastodonConfigured: boolean,
  ) {}

  inspect(now = new Date()): HealthReport {
    let databaseStatus: 'ok' | 'unhealthy' = 'ok';
    try {
      this.database.prepare('SELECT 1').get();
    } catch {
      databaseStatus = 'unhealthy';
    }

    let mediaStatus: 'ok' | 'unhealthy' = 'ok';
    try {
      for (const directory of [
        this.mediaRoot,
        path.join(this.mediaRoot, 'originals'),
        path.join(this.mediaRoot, 'derived'),
      ]) {
        fs.accessSync(directory, fs.constants.R_OK | fs.constants.W_OK);
      }
    } catch {
      mediaStatus = 'unhealthy';
    }

    let outbox = {
      failed: 0,
      oldestPendingAt: null as string | null,
      pending: 0,
      processing: 0,
      status: 'ok' as 'ok' | 'degraded' | 'unhealthy',
    };
    try {
      const staleBefore = new Date(now.getTime() - PROCESSING_STALE_AFTER_MS).toISOString();
      const counts = this.database.prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN state = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
          COALESCE(SUM(CASE WHEN state = 'processing' THEN 1 ELSE 0 END), 0) AS processing,
          COALESCE(SUM(CASE WHEN state = 'failed' THEN 1 ELSE 0 END), 0) AS failed,
          MIN(CASE WHEN state = 'pending' THEN created_at END) AS oldest_pending_at,
          COALESCE(SUM(CASE WHEN state = 'processing' AND locked_at <= ? THEN 1 ELSE 0 END), 0) AS stale_processing
        FROM outbox_jobs
      `).get(staleBefore) as OutboxCounts;
      const backlogOld = counts.oldest_pending_at !== null
        && Date.parse(counts.oldest_pending_at) <= now.getTime() - BACKLOG_DEGRADED_AFTER_MS;
      outbox = {
        failed: counts.failed,
        oldestPendingAt: counts.oldest_pending_at,
        pending: counts.pending,
        processing: counts.processing,
        status: counts.failed > 0 || counts.stale_processing > 0 || backlogOld ? 'degraded' : 'ok',
      };
    } catch {
      outbox.status = 'unhealthy';
    }

    const coreUnhealthy = databaseStatus === 'unhealthy' || mediaStatus === 'unhealthy'
      || outbox.status === 'unhealthy';
    const mastodonStatus = !this.mastodonConfigured
      ? 'disabled'
      : outbox.status === 'degraded' ? 'degraded' : 'ok';
    return {
      checks: {
        database: { status: databaseStatus },
        mastodon: { configured: this.mastodonConfigured, status: mastodonStatus },
        media: { status: mediaStatus },
        outbox,
      },
      status: coreUnhealthy ? 'unhealthy' : mastodonStatus === 'degraded' ? 'degraded' : 'ok',
      timestamp: now.toISOString(),
    };
  }
}
