import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createECDH, randomBytes } from 'node:crypto';
import dns from 'node:dns/promises';
import https from 'node:https';
import test from 'node:test';
import webpush from 'web-push';
import { getPushConfig } from '../src/push/config';
import { createPushSender, PushSendError } from '../src/push/sender';

const keys = webpush.generateVAPIDKeys();
const config = getPushConfig({ JGANTTS_PUSH_VAPID_PUBLIC_KEY: keys.publicKey, JGANTTS_PUSH_VAPID_PRIVATE_KEY: keys.privateKey, JGANTTS_PUSH_VAPID_SUBJECT: 'mailto:contact@example.com' }, 'https://example.com');
const curve = createECDH('prime256v1'); curve.generateKeys();
const subscription = { endpoint: 'https://web.push.apple.com/example', keys: { p256dh: curve.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };

test('transport encrypts a visible payload, pins validated DNS, and rejects redirects without following them', async t => {
  t.mock.method(dns, 'lookup', async () => [{ address: '17.1.2.3', family: 4 }]);
  let requests = 0; let responseStatus = 201;
  t.mock.method(https, 'request', (_url: URL, options: any, callback: any) => {
    requests++;
    assert.equal(options.family, 4); assert.equal(options.agent, false);
    options.lookup('web.push.apple.com', {}, (error: unknown, address: string, family: number) => {
      assert.equal(error, null); assert.equal(address, '17.1.2.3'); assert.equal(family, 4);
    });
    assert.equal(options.headers['Content-Encoding'], 'aes128gcm');
    assert.equal(options.headers.Urgency, 'high');
    assert.match(options.headers.Authorization, /^vapid /);
    const req = new EventEmitter() as EventEmitter & { end: (body: Buffer) => void; destroy: () => void };
    req.end = body => { assert.ok(Buffer.isBuffer(body)); assert.ok(body.length > 20); queueMicrotask(() => { callback({ statusCode: responseStatus, headers: { location: 'http://127.0.0.1/' }, resume() {} }); req.emit('close'); }); };
    req.destroy = () => { req.emit('error', new Error()); req.emit('close'); };
    return req;
  });
  const send = createPushSender(config);
  await send(subscription, '{"title":"Test"}', config.keyVersion, 60);
  responseStatus = 302;
  await assert.rejects(send(subscription, '{}', config.keyVersion, 60), (error: unknown) => error instanceof PushSendError && error.status === 302);
  assert.equal(requests, 2);
});

test('DNS answers with any private address are rejected before opening a connection', async t => {
  t.mock.method(dns, 'lookup', async () => [{ address: '17.1.2.3', family: 4 }, { address: '127.0.0.1', family: 4 }]);
  const request = t.mock.method(https, 'request', () => { throw new Error('must not connect'); });
  await assert.rejects(createPushSender(config)(subscription, '{}', config.keyVersion, 60));
  assert.equal(request.mock.callCount(), 0);
});
