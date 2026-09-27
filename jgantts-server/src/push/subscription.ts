import { ECDH } from 'node:crypto';

export interface Subscription { endpoint: string; keys: { p256dh: string; auth: string } }
export function pushError(status: number, message: string): Error {
  return Object.assign(new Error(message), { status, expose: true });
}
export function validateEndpoint(endpoint: unknown): string {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) throw pushError(400, 'Invalid push endpoint.');
  let url: URL;
  try { url = new URL(endpoint); } catch { throw pushError(400, 'Invalid push endpoint.'); }
  const allowed = url.hostname === 'fcm.googleapis.com'
    || url.hostname === 'updates.push.services.mozilla.com'
    || /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname)
    || url.hostname === 'web.push.apple.com';
  if (!allowed || url.protocol !== 'https:' || url.port || url.username || url.password || url.hash) {
    throw pushError(400, 'This push provider is not supported.');
  }
  return url.href;
}
export function validateSubscription(value: unknown): Subscription {
  const v = value as Partial<Subscription> | null;
  const endpoint = validateEndpoint(v?.endpoint);
  if (!v?.keys || typeof v.keys.auth !== 'string' || typeof v.keys.p256dh !== 'string'
    || !/^[\w-]{22}$/.test(v.keys.auth) || !/^[\w-]{87}$/.test(v.keys.p256dh)) {
    throw pushError(400, 'Invalid subscription keys.');
  }
  try { ECDH.convertKey(Buffer.from(v.keys.p256dh, 'base64url'), 'prime256v1'); }
  catch { throw pushError(400, 'Invalid subscription encryption key.'); }
  return { endpoint, keys: { auth: v.keys.auth, p256dh: v.keys.p256dh } };
}
export function validateCredential(value: unknown): string {
  if (typeof value !== 'string' || !/^[\w-]{43}$/.test(value)) throw pushError(400, 'Invalid installation credential.');
  return value;
}
