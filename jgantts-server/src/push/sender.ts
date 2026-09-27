import { lookup } from 'node:dns/promises';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';
import webpush from 'web-push';
import type { PushConfig } from './config';
import type { Subscription } from './subscription';
import { validateEndpoint } from './subscription';

const blocked = new BlockList();
for (const [ip, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]] as const) blocked.addSubnet(ip, prefix, 'ipv4');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
for (const [ip, prefix] of [['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20]] as const) blocked.addSubnet(ip, prefix, 'ipv6');
export function publicAddress(address: string): boolean {
  if (isIP(address) === 4) return !blocked.check(address, 'ipv4');
  // Accept only global unicast; reject mapped/private/link-local/multicast addresses.
  if (isIP(address) === 6) return globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
  return false;
}
export class PushSendError extends Error {
  constructor(readonly status: number | null, readonly retryAfterMs = 0) { super('Push provider request failed.'); }
}
export type PushSender = (subscription: Subscription, payload: string, version: string, ttl: number, isCurrent?: () => boolean) => Promise<void | boolean>;
export function createPushSender(config: PushConfig): PushSender {
  return async (subscription, payload, version, ttl, isCurrent = () => true) => {
    const startedAt = Date.now();
    const endpoint = new URL(validateEndpoint(subscription.endpoint));
    const key = config.keys[version];
    if (!key) throw new PushSendError(401);
    // Resolve once, validate, and pin the connection to that address (no DNS rebinding).
    let dnsTimer: ReturnType<typeof setTimeout> | undefined;
    const addresses = await Promise.race([
      lookup(endpoint.hostname, { all: true }),
      new Promise<never>((_resolve, reject) => { dnsTimer = setTimeout(() => reject(new PushSendError(null)), 10_000); }),
    ]).finally(() => clearTimeout(dnsTimer));
    if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) throw new PushSendError(400);
    const address = addresses.find(item => item.family === 4) ?? addresses[0];
    let details: ReturnType<typeof webpush.generateRequestDetails>;
    try {
      details = webpush.generateRequestDetails(subscription, payload, {
        vapidDetails: { ...key, subject: config.subject }, TTL: Math.max(0, ttl - Math.ceil((Date.now() - startedAt) / 1000)), urgency: 'high', contentEncoding: 'aes128gcm',
      });
    } catch { throw new PushSendError(400); }
    if (!isCurrent()) return false;
    await new Promise<void>((resolve, reject) => {
      const req = https.request(endpoint, {
        method: details.method, headers: details.headers, agent: false, family: address.family,
        lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
      }, res => {
        // Never follow redirects or retain provider bodies, which may contain endpoints.
        res.resume();
        const status = res.statusCode ?? 500;
        const retry = res.headers['retry-after'];
        const raw = typeof retry === 'string' ? retry : '';
        const delay = /^\d+$/.test(raw) ? Number(raw) * 1000 : Math.max(0, Date.parse(raw) - Date.now()) || 0;
        if (status >= 200 && status < 300) resolve();
        else reject(new PushSendError(status, delay));
      });
      const timeout = setTimeout(() => req.destroy(new PushSendError(null)), 15_000);
      req.once('close', () => clearTimeout(timeout));
      req.once('error', () => reject(new PushSendError(null)));
      req.end(details.body);
    });
  };
}
