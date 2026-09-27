import sanitizeHtml from 'sanitize-html';
import type { StructuredLogger } from '../observability/logger';
import { NOOP_LOGGER } from '../observability/logger';
import type { PushConfig } from './config';
import { PushRepository, type PushDelivery } from './repository';
import { PushSendError, type PushSender } from './sender';

const plain = (value: unknown, limit: number) => Array.from(sanitizeHtml(typeof value === 'string' ? value : '', { allowedTags: [], allowedAttributes: {} })
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ').trim()).slice(0, limit).join('');
export function notificationPayload(job: PushDelivery): string {
  const source = JSON.parse(job.payload_json);
  const neutral = source.contentWarning;
  return JSON.stringify({
    version: 1, eventId: job.event_id,
    title: source.test ? 'Notifications are connected' : neutral ? 'New post on JGantts.com' : plain(source.title, 80) || 'New post on JGantts.com',
    body: source.test ? 'You will hear when a new post is published.' : neutral ? 'Open JGantts.com to read this post and its content warning.' : plain(source.excerpt || source.bodyHtml, 140) || 'Open to see the latest post.',
    url: source.test ? '/photos' : `/photos/${encodeURIComponent(String(source.slug).slice(0, 200))}`,
  });
}
export class PushWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private active: Promise<void> | null = null;
  private stopped = false;
  private wakeRequested = false;
  constructor(private readonly repository: PushRepository, private readonly config: PushConfig, private readonly send: PushSender, private readonly logger: StructuredLogger = NOOP_LOGGER) {}
  start() {
    this.stopped = false;
    if (this.timer) return;
    this.timer = setInterval(() => { void this.runOnce(); }, 5000);
    this.timer.unref();
    void this.runOnce();
  }
  async stop() { this.stopped = true; if (this.timer) clearInterval(this.timer); this.timer = null; await this.active; }
  wake(): void {
    if (this.stopped) return;
    this.wakeRequested = true;
    void this.runOnce();
  }
  runOnce(): Promise<void> {
    if (this.active) return this.active;
    this.active = (async () => {
      do {
        this.wakeRequested = false;
        await this.run();
      } while (this.wakeRequested && !this.stopped);
    })().catch(() => this.logger.error('push_worker_failed', { message: 'Push queue operation failed.' })).finally(() => { this.active = null; });
    return this.active;
  }
  private async run() {
    if (this.stopped) return;
    this.repository.maintain();
    if (!this.config.sendEnabled || this.stopped) return;
    this.repository.fanOut();
    const jobs: PushDelivery[] = [];
    for (let i = 0; i < 4; i++) {
      const job = this.repository.claim(this.config.audience);
      if (job) jobs.push(job);
    }
    await Promise.all(jobs.map(job => this.deliver(job)));
  }
  private async deliver(job: PushDelivery) {
    if (!this.repository.current(job.id, job.lease_token)) return;
    if (job.attempts > 6) { this.repository.finish(job, 'failed', null); return; }
    try {
      const delivered = await this.send({ endpoint: job.endpoint, keys: { p256dh: job.p256dh, auth: job.auth } }, notificationPayload(job), job.key_version,
        Math.max(1, Math.floor((job.expires_at - Date.now()) / 1000)),
        () => Boolean(this.repository.current(job.id, job.lease_token)));
      if (delivered === false) { this.repository.finish(job, 'cancelled', null); return; }
      this.repository.finish(job, 'accepted', 201);
      this.logger.info('push_provider_accepted', { deliveryId: job.id, eventId: job.event_id, elapsedMs: Date.now() - job.event_created_at });
    } catch (error) {
      const status = error instanceof PushSendError ? error.status : null;
      if (status === 404 || status === 410) this.repository.disable(job.subscription_id);
      const retryable = status === null || status === 429 || status >= 500;
      const delay = Math.max(error instanceof PushSendError ? error.retryAfterMs : 0,
        Math.min(3600_000, 30_000 * 2 ** (job.attempts - 1)) * (0.75 + Math.random() * 0.5));
      const next = Date.now() + Math.ceil(Math.min(86400_000, delay));
      this.repository.finish(job, retryable && job.attempts < 6 && next < job.expires_at ? 'pending' : 'failed', status, next);
      this.logger.warn('push_delivery_failed', { deliveryId: job.id, eventId: job.event_id, status, retryable });
    }
  }
}
