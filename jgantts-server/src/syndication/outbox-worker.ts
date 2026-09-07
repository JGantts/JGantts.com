import { MastodonRequestError, type MastodonClientLike } from './mastodon-client';
import { FacebookRequestError, type FacebookClientLike } from './facebook-client';
import { NOOP_LOGGER, type StructuredLogger } from '../observability/logger';
import { buildMastodonStatus } from './mastodon-syndication-service';
import { SyndicationRepository } from './syndication-repository';
import type { OutboxJob } from './types';

const MAX_ATTEMPTS = 8;
const MAX_BACKOFF_MS = 60 * 60_000;

function boundedError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown Mastodon publishing error.';
  return message.slice(0, 2_000);
}

function retryDelay(job: OutboxJob, error: unknown): number {
  if (error instanceof MastodonRequestError && error.retryAfterMs !== null) {
    return Math.min(MAX_BACKOFF_MS, Math.max(1_000, error.retryAfterMs));
  }
  if (error instanceof FacebookRequestError && error.retryAfterMs !== null) {
    return Math.min(MAX_BACKOFF_MS, Math.max(1_000, error.retryAfterMs));
  }
  const base = Math.min(MAX_BACKOFF_MS, 5_000 * (2 ** Math.max(0, job.attemptCount - 1)));
  return Math.min(MAX_BACKOFF_MS, Math.max(1_000, Math.round(base * (0.8 + Math.random() * 0.4))));
}

export class OutboxWorker {
  private timer: NodeJS.Timeout | null = null;
  private activeRun: Promise<boolean> | null = null;

  constructor(
    private readonly repository: SyndicationRepository,
    private readonly mastodon: MastodonClientLike | null,
    private readonly pollIntervalMs = 5_000,
    private readonly logger: StructuredLogger = NOOP_LOGGER,
    private readonly facebook: FacebookClientLike | null = null,
  ) {}

  start(): void {
    if (this.timer) return;
    void this.runOnce();
    this.timer = setInterval(() => { void this.runOnce(); }, this.pollIntervalMs);
    this.timer.unref();
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.activeRun;
  }

  runOnce(): Promise<boolean> {
    if (this.activeRun) return this.activeRun;
    this.activeRun = this.processNext().finally(() => { this.activeRun = null; });
    return this.activeRun;
  }

  private async processNext(): Promise<boolean> {
    const jobs = [this.repository.claimNext(), this.repository.claimNext()].filter((job): job is OutboxJob => Boolean(job));
    if (!jobs.length) return false;
    await Promise.all(jobs.map((job) => this.processJob(job)));
    return true;
  }

  private async processJob(job: OutboxJob): Promise<void> {
    try {
      if (job.kind === 'facebook.publish_link') {
        if (!this.facebook) throw new FacebookRequestError('Facebook syndication is not configured.', true);
        const remote = await this.facebook.publishLink(job.payload.teaser, job.payload.canonicalUrl);
        this.repository.completePublication(job, remote);
        return;
      }
      if (!this.mastodon) throw new MastodonRequestError('Mastodon syndication is not configured.', 503);
      const limit = await this.mastodon.getStatusCharacterLimit();
      const status = buildMastodonStatus(job.payload.teaser, job.payload.canonicalUrl, limit);
      const syndication = this.repository.getById(job.payload.syndicationId);
      if (!syndication) throw new Error('Syndication record no longer exists.');
      const remote = job.kind === 'mastodon.publish_status'
        ? await this.mastodon.publishStatus(status, job.payload.idempotencyKey)
        : await this.mastodon.editStatus(
          syndication.remoteStatusId ?? (() => { throw new Error('Remote status ID is missing.'); })(),
          status,
          job.payload.idempotencyKey,
        );
      if (job.kind === 'mastodon.publish_status') this.repository.completePublication(job, remote);
      else this.repository.completeEdit(job, remote);
      this.logger.info('outbox_job_completed', {
        attempt: job.attemptCount,
        jobId: job.id,
        kind: job.kind,
        syndicationId: job.payload.syndicationId,
      });
    } catch (error) {
      const permanent = (error instanceof MastodonRequestError && error.permanent) || (error instanceof FacebookRequestError && error.permanent);
      const uncertain = error instanceof FacebookRequestError && error.uncertain;
      if (uncertain) { this.repository.markUncertain(job, boundedError(error)); return; }
      if (permanent || job.attemptCount >= MAX_ATTEMPTS) {
        this.repository.fail(job, boundedError(error));
        this.logger.error('outbox_job_failed', {
          attempt: job.attemptCount,
          error,
          ...(error instanceof FacebookRequestError ? { facebook: error.meta } : {}),
          jobId: job.id,
          kind: job.kind,
          permanent,
          syndicationId: job.payload.syndicationId,
        });
      } else {
        const availableAt = new Date(Date.now() + retryDelay(job, error));
        this.repository.reschedule(job, boundedError(error), availableAt);
        this.logger.warn('outbox_job_rescheduled', {
          attempt: job.attemptCount,
          availableAt: availableAt.toISOString(),
          error,
          ...(error instanceof FacebookRequestError ? { facebook: error.meta } : {}),
          jobId: job.id,
          kind: job.kind,
          syndicationId: job.payload.syndicationId,
        });
      }
    }
  }
}
