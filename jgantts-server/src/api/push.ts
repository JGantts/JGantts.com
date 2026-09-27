import express from 'express';
import { isInstallationUuid, type PushConfig } from '../push/config';
import type { PushRepository } from '../push/repository';
import { pushError, validateCredential, validateEndpoint, validateSubscription } from '../push/subscription';

export interface PushServices { repository: PushRepository; config: PushConfig }
function sameOrigin(origin: string): express.RequestHandler {
  return (req, _res, next) => {
    if (req.get('Origin') !== origin || req.get('Sec-Fetch-Site') === 'cross-site') { next(pushError(403, 'Use notification settings on this site.')); return; }
    next();
  };
}
function rateLimit(limit: number): express.RequestHandler {
  const buckets = new Map<string, { count: number; until: number }>();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, value] of buckets) if (value.until < now) buckets.delete(key);
    const key = req.ip ?? 'unknown';
    const bucket = buckets.get(key) ?? { count: 0, until: now + 60_000 };
    // Also bound memory if the application is exposed directly to many addresses.
    if (buckets.size >= 10000 || ++bucket.count > limit) { res.set('Retry-After', '60'); next(pushError(429, 'Please wait a minute and try again.')); return; }
    buckets.set(key, bucket); next();
  };
}
export function createPushRouter({ repository, config }: PushServices) {
  const router = express.Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/config', (_req, res) => res.json({ enabled: config.enabled, publicKey: config.publicKey, keyVersion: config.keyVersion, payloadVersion: 1 }));
  router.post('/subscriptions', sameOrigin(config.siteOrigin), rateLimit(30), (req, res) => {
    if (!config.enabled) throw pushError(503, 'Notification enrollment is temporarily unavailable.');
    if (JSON.stringify(req.body ?? {}).length > 4096) throw pushError(413, 'Subscription is too large.');
    if (req.body?.keyVersion !== config.keyVersion) throw pushError(409, 'Reload notification settings before subscribing.');
    res.status(201).json(repository.register(validateSubscription(req.body.subscription), validateCredential(req.body.credential), config.keyVersion));
  });
  router.delete('/subscriptions', sameOrigin(config.siteOrigin), rateLimit(60), (req, res) => {
    repository.revokeEndpoint(validateEndpoint(req.body?.endpoint), validateCredential(req.get('X-Push-Credential')));
    res.status(204).end();
  });
  router.delete('/subscriptions/:id', sameOrigin(config.siteOrigin), rateLimit(60), (req, res) => {
    const raw = String(req.params.id);
    const id = /^\d+$/.test(raw) ? Number(raw) : raw.toLowerCase();
    if (typeof id === 'number' ? !Number.isSafeInteger(id) || id < 1 : !isInstallationUuid(id)) throw pushError(400, 'Invalid installation ID.');
    repository.revoke(id, validateCredential(req.get('X-Push-Credential')));
    res.status(204).end();
  });
  return router;
}
export function createAdminPushRouter({ repository, config }: PushServices) {
  const router = express.Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/status', (_req, res) => res.json({ ...repository.status(), enabled: config.enabled, sendEnabled: config.sendEnabled, audience: config.audience }));
  router.post('/test', sameOrigin(config.siteOrigin), rateLimit(5), (req, res) => {
    const raw = req.body?.subscriptionId;
    const id = typeof raw === 'string' ? raw.toLowerCase() : raw;
    if (!config.sendEnabled) throw pushError(409, 'Push sending is disabled.');
    if (!(isInstallationUuid(id) || (Number.isSafeInteger(id) && id > 0)) || !repository.allows(id, config.audience)) throw pushError(400, 'Select an allowed canary installation ID.');
    res.status(202).json({ eventId: repository.enqueueTest(id) });
  });
  return router;
}
