import assert from 'node:assert/strict';
import { createECDH, createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import Database from 'better-sqlite3';
import webpush from 'web-push';
import { openContentDatabase, inTransaction } from '../src/db/database';
import { migrations, migrateDatabase } from '../src/db/migrations';
import { PostRepository } from '../src/posts/post-repository';
import { PostService } from '../src/posts/post-service';
import { PushRepository } from '../src/push/repository';
import { getPushConfig, isInstallationUuid } from '../src/push/config';
import { notificationPayload, PushWorker } from '../src/push/worker';
import { PushSendError, publicAddress } from '../src/push/sender';
import { validateEndpoint, validateSubscription } from '../src/push/subscription';
import { createApp } from '../src/app';

const keys = webpush.generateVAPIDKeys();
const config = () => getPushConfig({ JGANTTS_PUSH_ENABLED: 'true', JGANTTS_PUSH_SEND_ENABLED: 'true', JGANTTS_PUSH_AUDIENCE: '*', JGANTTS_PUSH_VAPID_PUBLIC_KEY: keys.publicKey, JGANTTS_PUSH_VAPID_PRIVATE_KEY: keys.privateKey, JGANTTS_PUSH_VAPID_SUBJECT: 'mailto:contact@example.com' }, 'https://example.com');
const credential = () => randomBytes(32).toString('base64url');
function subscription(id = 'one') {
  const curve = createECDH('prime256v1'); curve.generateKeys();
  return { endpoint: `https://web.push.apple.com/${id}`, keys: { p256dh: curve.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
}
function fixture(t: test.TestContext) {
  const db = openContentDatabase(':memory:'); t.after(() => db.close());
  const repository = new PushRepository(db); repository.setEnrollment(true);
  const posts = new PostRepository(db); const service = new PostService(posts);
  const subscribe = (id: string) => repository.register(subscription(id), credential(), config().keyVersion).id;
  const draft = (id: string) => posts.create({ id, slug: id, title: 'Hello', bodyHtml: '<p>A new post.</p>', bodyMarkdown: 'A new post.' });
  return { db, repository, posts, service, subscribe, draft };
}

test('first publication is atomic and unique across edits, retries, and republishing', t => {
  const { db, repository, service, posts, subscribe, draft } = fixture(t);
  subscribe('one'); draft('post');
  assert.throws(() => inTransaction(db, () => { service.publish('post'); throw new Error('rollback'); }));
  assert.equal(db.prepare('SELECT count(*) FROM push_publication_events').pluck().get(), 0);
  assert.equal(posts.getById('post')?.status, 'draft');
  service.publish('post'); service.publish('post'); posts.update('post', { title: 'Changed' });
  assert.equal(db.prepare('SELECT count(*) FROM push_publication_events').pluck().get(), 1);
  repository.fanOut(); assert.ok(repository.claim('*'));
  service.unpublish('post'); service.publish('post');
  assert.equal(repository.claim('*'), null);
  assert.equal(db.prepare('SELECT state FROM push_publication_events').pluck().get(), 'cancelled');
});

test('suppression, direct imports, disabled enrollment, and draft saves never broadcast', t => {
  const { db, repository, service, posts, subscribe, draft } = fixture(t); subscribe('one');
  draft('silent'); service.publish('silent', undefined, true);
  posts.create({ id: 'import', slug: 'import', status: 'published', bodyMarkdown: '', bodyHtml: '' });
  repository.setEnrollment(false); draft('disabled'); service.publish('disabled');
  draft('draft'); posts.update('draft', { title: 'Save' });
  assert.equal(db.prepare("SELECT count(*) FROM push_publication_events WHERE state = 'suppressed'").pluck().get(), 3);
  assert.equal(repository.fanOut(), false);
});

test('migration seeds historic publication markers including unpublished revision history', () => {
  const db = new Database(':memory:');
  try {
    for (const migration of migrations.filter(m => m.version < 14)) db.exec(migration.sql);
    db.exec(`CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT);
      INSERT INTO posts (id, slug, body_markdown, body_html, status, created_at, updated_at) VALUES ('history', 'history', '', '', 'draft', '', '');
      INSERT INTO post_revisions (post_id, revision_number, slug, body_markdown, body_html, status, created_at) VALUES ('history', 1, 'history', '', '', 'published', '');`);
    for (const m of migrations.filter(m => m.version < 14)) db.prepare('INSERT INTO schema_migrations VALUES (?, ?, ?)').run(m.version, m.name, '');
    migrateDatabase(db);
    const repository = new PushRepository(db); repository.setEnrollment(true);
    new PostService(new PostRepository(db)).publish('history');
    assert.equal(db.prepare('SELECT state FROM push_publication_events').pluck().get(), 'suppressed');
  } finally { db.close(); }
});

test('bounded fan-out excludes later subscriptions and cancellation wins over a lease', t => {
  const { db, repository, service, subscribe, draft } = fixture(t);
  const a = subscribe('a'); const b = subscribe('b'); draft('post'); service.publish('post'); subscribe('late');
  repository.fanOut(Date.now(), 1); repository.fanOut(Date.now(), 1); repository.fanOut(Date.now(), 1);
  assert.equal(db.prepare('SELECT count(*) FROM push_deliveries').pluck().get(), 2);
  const job = repository.claim([a])!; assert.equal(job.subscription_id, repository.resolveId(a));
  repository.disable(repository.resolveId(a)!); assert.equal(repository.current(job.id, job.lease_token), null);
  repository.finish(job, 'accepted', 201);
  assert.equal(db.prepare('SELECT state FROM push_deliveries WHERE id = ?').pluck().get(job.id), 'cancelled');
  assert.equal(repository.claim([b])?.subscription_id, repository.resolveId(b));
});

test('leases recover after expiry without accepting stale completion and expiry cancels jobs', t => {
  const { db, repository, service, subscribe, draft } = fixture(t); subscribe('a'); draft('post'); service.publish('post'); repository.fanOut();
  const now = Date.now(); const first = repository.claim('*', now)!;
  assert.equal(repository.claim('*', now), null);
  const recovered = repository.claim('*', now + 60_001)!;
  assert.notEqual(first.lease_token, recovered.lease_token);
  repository.finish(first, 'accepted', 201);
  assert.equal(db.prepare('SELECT state FROM push_deliveries').pluck().get(), 'processing');
  repository.maintain(now + 86400_001);
  assert.equal(repository.current(recovered.id, recovered.lease_token), null);
});

test('subscription registration authenticates retries and revocation erases provider secrets', t => {
  const { db, repository } = fixture(t); const sub = subscription(); const token = credential();
  const first = repository.register(sub, token, 'v1');
  assert.deepEqual(repository.register(sub, token, 'v1'), first);
  assert.throws(() => repository.register(sub, credential(), 'v1'), /Reset/);
  assert.throws(() => repository.revoke(first.id, credential()), /not found/);
  repository.revokeEndpoint(sub.endpoint, token); repository.revoke(first.id, token);
  assert.deepEqual(db.prepare('SELECT active, endpoint, p256dh, auth FROM push_subscriptions').get(), { active: 0, endpoint: null, p256dh: null, auth: null });
  assert.throws(() => repository.register(sub, token, 'v1'), /revoked/);
});

test('worker retries transient failure then records provider acceptance; expired endpoints are disabled', async t => {
  const { db, repository, service, subscribe, draft } = fixture(t); subscribe('a'); draft('post'); service.publish('post');
  let attempts = 0;
  const worker = new PushWorker(repository, config(), async (_sub, payload, _version, ttl) => {
    assert.ok(ttl <= 86400 && ttl > 0); assert.equal(JSON.parse(payload).url, '/photos/post');
    if (++attempts === 1) throw new PushSendError(429, 120_000);
  });
  await worker.runOnce();
  const retry = db.prepare('SELECT * FROM push_deliveries').get() as { state: string; available_at: number };
  assert.equal(retry.state, 'pending'); assert.ok(retry.available_at >= Date.now() + 119_000);
  db.prepare('UPDATE push_deliveries SET available_at = 0').run(); await worker.runOnce();
  assert.equal(db.prepare('SELECT state FROM push_deliveries').pluck().get(), 'accepted');
  draft('next'); service.publish('next');
  await new PushWorker(repository, config(), async () => { throw new PushSendError(410); }).runOnce();
  assert.equal(repository.status().activeSubscriptions, 0);
});

test('payload protects content warnings and no sends escape the canary audience or kill switch', async t => {
  const { repository, service, posts, subscribe, draft } = fixture(t); const id = subscribe('a'); draft('post');
  posts.update('post', { contentWarning: 'private', title: 'Secret title' }); service.publish('post'); repository.fanOut();
  const job = repository.claim('*')!;
  assert.doesNotMatch(notificationPayload(job), /Secret title|A new post/);
  repository.finish(job, 'pending', null, 0);
  let sent = 0;
  await new PushWorker(repository, { ...config(), sendEnabled: false }, async () => { sent++; }).runOnce();
  await new PushWorker(repository, { ...config(), audience: [] }, async () => { sent++; }).runOnce();
  assert.equal(sent, 0);
  await new PushWorker(repository, { ...config(), audience: [id] }, async () => { sent++; }).runOnce();
  assert.equal(sent, 1);
});

test('durable queue survives a database reopen', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'push-restart-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const filename = path.join(root, 'content.sqlite'); let db = openContentDatabase(filename);
  const repository = new PushRepository(db); repository.setEnrollment(true); repository.register(subscription(), credential(), 'v1');
  new PostRepository(db).create({ id: 'post', slug: 'post', bodyHtml: '', bodyMarkdown: '' }); new PostService(new PostRepository(db)).publish('post');
  repository.fanOut(); db.close(); db = openContentDatabase(filename);
  try { assert.equal(new PushRepository(db).claim('*')?.event_id, 'post'); } finally { db.close(); }
});

test('configuration validates keys and defaults to nobody receiving a send', () => {
  assert.deepEqual(getPushConfig({}, '').audience, []);
  assert.throws(() => getPushConfig({ JGANTTS_PUSH_ENABLED: 'true' }, ''), /requires/);
  assert.throws(() => getPushConfig({ JGANTTS_PUSH_VAPID_PUBLIC_KEY: keys.publicKey, JGANTTS_PUSH_VAPID_PRIVATE_KEY: 'wrong' }, ''), /matching/);
  assert.ok(config().keys[config().keyVersion]);
});

test('provider and key validation reject arbitrary network destinations', () => {
  for (const url of ['http://web.push.apple.com/a', 'https://web.push.apple.com.evil.test/a', 'https://127.0.0.1/a', 'https://web.push.apple.com:444/a', 'https://x@web.push.apple.com/a', 'https://web.push.apple.com/a#b']) assert.throws(() => validateEndpoint(url));
  assert.doesNotThrow(() => validateSubscription(subscription()));
  assert.throws(() => validateSubscription({ ...subscription(), keys: { auth: 'bad', p256dh: 'bad' } }));
  for (const address of ['127.0.0.1', '169.254.169.254', '10.1.1.1', '::1', '::ffff:127.0.0.1', 'fc00::1', '2001:db8::1']) assert.equal(publicAddress(address), false);
  assert.equal(publicAddress('8.8.8.8'), true); assert.equal(publicAddress('2606:4700::1111'), true);
});

test('HTTP requires origin and ownership; disabled enrollment still permits revoke; admin test is authenticated', async t => {
  const { repository } = fixture(t); const cfg = config();
  const app = createApp({ adminToken: 'admin-test', services: { push: { repository, config: cfg } } });
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const sub = subscription(); const token = credential();
  const body = JSON.stringify({ subscription: sub, credential: token, keyVersion: cfg.keyVersion });
  const headers = { 'Content-Type': 'application/json', Origin: cfg.siteOrigin };
  assert.equal((await fetch(origin + '/api/push/subscriptions', { method: 'POST', body, headers: { 'Content-Type': 'application/json' } })).status, 403);
  const response = await fetch(origin + '/api/push/subscriptions', { method: 'POST', body, headers });
  assert.equal(response.status, 201); const { id } = await response.json();
  assert.ok(isInstallationUuid(id));
  cfg.audience = [id];
  assert.equal((await fetch(origin + '/api/admin/push/status')).status, 401);
  assert.equal((await fetch(origin + '/api/admin/push/test', { method: 'POST', headers: { ...headers, Authorization: 'Bearer admin-test' }, body: JSON.stringify({ subscriptionId: id }) })).status, 202);
  assert.equal((await fetch(origin + '/api/admin/push/test', { method: 'POST', headers: { ...headers, Authorization: 'Bearer admin-test' }, body: JSON.stringify({ subscriptionId: '184a1f93-09e2-430d-8016-1f0765693f00' }) })).status, 400);
  for (const numericId of [1, '1']) {
    assert.equal((await fetch(origin + '/api/admin/push/test', { method: 'POST', headers: { ...headers, Authorization: 'Bearer admin-test' }, body: JSON.stringify({ subscriptionId: numericId }) })).status, 400);
  }
  assert.equal((await fetch(origin + '/api/push/subscriptions/1', { method: 'DELETE', headers: { ...headers, 'X-Push-Credential': token } })).status, 400);
  assert.equal((await fetch(origin + `/api/push/subscriptions/${id}`, { method: 'DELETE', headers: { ...headers, 'X-Push-Credential': credential() } })).status, 404);
  assert.equal((await fetch(origin + `/api/push/subscriptions/${id}`, { method: 'DELETE', headers: { ...headers, 'X-Push-Credential': token } })).status, 204);
  cfg.enabled = false;
  assert.equal((await fetch(origin + '/api/push/subscriptions', { method: 'POST', body, headers })).status, 503);
  assert.equal((await fetch(origin + '/api/push/subscriptions', { method: 'DELETE', headers: { ...headers, 'X-Push-Credential': token }, body: JSON.stringify({ endpoint: sub.endpoint }) })).status, 204);
});

test('worker uses integral retry timestamps for jittered transient errors and stops at the attempt limit', async t => {
  const { db, repository, service, subscribe, draft } = fixture(t); subscribe('a'); draft('post'); service.publish('post');
  const worker = new PushWorker(repository, config(), async () => { throw new PushSendError(503); });
  for (let attempt = 1; attempt <= 6; attempt++) {
    await worker.runOnce();
    const row = db.prepare('SELECT state, available_at FROM push_deliveries').get() as { state: string; available_at: number };
    assert.equal(row.state, attempt < 6 ? 'pending' : 'failed'); assert.ok(Number.isInteger(row.available_at));
    db.prepare('UPDATE push_deliveries SET available_at = 0').run();
  }
});

test('shutdown waits for the active provider request, and concurrent ticks do not overlap', async t => {
  const { db, repository, service, subscribe, draft } = fixture(t); subscribe('a'); draft('post'); service.publish('post');
  let complete!: () => void; let sent = 0;
  const worker = new PushWorker(repository, config(), () => { sent++; return new Promise<void>(resolve => { complete = resolve; }); });
  const running = worker.runOnce(); assert.equal(worker.runOnce(), running);
  let stopped = false; const stop = worker.stop().then(() => { stopped = true; });
  await Promise.resolve(); assert.equal(stopped, false); assert.equal(sent, 1);
  complete(); await stop; assert.equal(stopped, true);
  assert.equal(db.prepare('SELECT state FROM push_deliveries').pluck().get(), 'accepted');
});

test('static install assets have the intended MIME/cache headers and missing worker never falls back to HTML', async t => {
  const server = createApp().listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  for (const [asset, type] of [['/sw.js', 'application/javascript'], ['/manifest.webmanifest', 'application/manifest+json']]) {
    const response = await fetch(origin + asset); assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type')?.includes(type)); assert.equal(response.headers.get('cache-control'), 'no-cache');
  }
  const manifest = await (await fetch(origin + '/manifest.webmanifest')).json();
  assert.equal(manifest.id, '/'); assert.equal(manifest.start_url, '/photos');
  const missing = createApp({ publicRoot: '/not-a-directory', appHtmlTemplate: '<html>fallback</html>' }).listen(0, '127.0.0.1'); await once(missing, 'listening');
  t.after(() => new Promise<void>(resolve => { missing.close(() => resolve()); missing.closeAllConnections(); }));
  const response = await fetch(`http://127.0.0.1:${(missing.address() as AddressInfo).port}/sw.js`);
  assert.equal(response.status, 404); assert.doesNotMatch(await response.text(), /fallback/);
});

test('revocation during sender preparation prevents a provider request from being treated as accepted', async t => {
  const { db, repository, service, subscribe, draft } = fixture(t); const id = subscribe('a'); draft('post'); service.publish('post');
  const worker = new PushWorker(repository, config(), async (_sub, _payload, _version, _ttl, isCurrent) => {
    repository.disable(repository.resolveId(id)!); assert.equal(isCurrent?.(), false); return false;
  });
  await worker.runOnce();
  assert.equal(db.prepare('SELECT state FROM push_deliveries').pluck().get(), 'cancelled');
});

test('direct SQL imports are suppressed and archive cancels queued publications', t => {
  const { db, repository, service, subscribe, draft } = fixture(t); subscribe('a');
  db.exec("INSERT INTO posts (id, slug, body_markdown, body_html, status, created_at, updated_at) VALUES ('imported', 'imported', '', '', 'published', '', '')");
  assert.equal(db.prepare("SELECT state FROM push_publication_events WHERE id = 'imported'").pluck().get(), 'suppressed');
  draft('post'); service.publish('post'); repository.fanOut(); service.archive('post');
  assert.equal(repository.claim('*'), null);
});

test('rotation retains old signing versions and requires re-subscription rather than relabeling endpoints', t => {
  const { repository } = fixture(t); const sub = subscription(); const token = credential();
  repository.register(sub, token, 'old-version');
  assert.throws(() => repository.register(sub, token, 'new-version'), /updated notification key/);
  const old = webpush.generateVAPIDKeys();
  const cfg = getPushConfig({ JGANTTS_PUSH_VAPID_PUBLIC_KEY: keys.publicKey, JGANTTS_PUSH_VAPID_PRIVATE_KEY: keys.privateKey, JGANTTS_PUSH_PREVIOUS_KEYS: JSON.stringify([old]) }, 'https://example.com');
  assert.equal(Object.keys(cfg.keys).length, 2);
});

test('registration rejects oversized requests and rate-limits repeated writes', async t => {
  const { repository } = fixture(t); const cfg = config();
  const server = createApp({ services: { push: { repository, config: cfg } } }).listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const headers = { Origin: cfg.siteOrigin, 'Content-Type': 'application/json' };
  assert.equal((await fetch(origin + '/api/push/subscriptions', { method: 'POST', headers, body: JSON.stringify({ padding: 'x'.repeat(5000) }) })).status, 413);
  const body = JSON.stringify({ subscription: subscription(), credential: credential(), keyVersion: cfg.keyVersion });
  for (let i = 0; i < 29; i++) assert.equal((await fetch(origin + '/api/push/subscriptions', { method: 'POST', headers, body })).status, 201);
  const limited = await fetch(origin + '/api/push/subscriptions', { method: 'POST', headers, body });
  assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '60');
});

test('authenticated browser key renewal updates encryption material without changing enrollment identity', t => {
  const { db, repository, service, draft } = fixture(t);
  const old = subscription('renewal'); const token = credential(); const version = config().keyVersion;
  const enrolled = repository.register(old, token, version, 100);
  draft('post'); service.publish('post'); repository.fanOut();
  const previousJob = repository.claim('*')!;
  repository.register(old, token, version, 150);
  assert.ok(repository.current(previousJob.id, previousJob.lease_token), 'unchanged keys retain the active lease');
  const renewed = subscription('renewal');
  assert.throws(() => repository.register(renewed, credential(), version, 200), /Reset/);
  assert.equal(db.prepare('SELECT p256dh FROM push_subscriptions').pluck().get(), old.keys.p256dh);
  assert.deepEqual(repository.register(renewed, token, version, 200), enrolled);
  assert.equal(repository.current(previousJob.id, previousJob.lease_token), null);
  repository.finish(previousJob, 'accepted', 201);
  const job = repository.claim('*')!;
  assert.equal(job.p256dh, renewed.keys.p256dh);
  assert.equal(job.auth, renewed.keys.auth);
  assert.equal(job.subscription_id, repository.resolveId(enrolled.id));
  assert.equal(db.prepare('SELECT created_at FROM push_subscriptions').pluck().get(), 100);
  assert.equal(db.prepare('SELECT last_seen_at FROM push_subscriptions').pluck().get(), 200);
});


test('installation UUID migration preserves credentials, queue ownership, and audience cutoffs', () => {
  const db = new Database(':memory:');
  try {
    db.exec('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)');
    for (const migration of migrations.filter(m => m.version <= 14)) {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations VALUES (?, ?, ?)').run(migration.version, migration.name, '');
    }
    const sub = subscription('existing'); const token = credential();
    const insert = db.prepare(`INSERT INTO push_subscriptions
      (endpoint_hash, endpoint, p256dh, auth, credential_hash, key_version, created_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, 'v1', 1, 1)`);
    insert.run(createHash('sha256').update(sub.endpoint).digest('hex'), sub.endpoint,
      sub.keys.p256dh, sub.keys.auth, createHash('sha256').update(token).digest('hex'));
    const repository = new PushRepository(db); repository.setEnrollment(true);
    const posts = new PostRepository(db); const service = new PostService(posts);
    posts.create({ id: 'before-migration', slug: 'before-migration', bodyMarkdown: '', bodyHtml: '' });
    service.publish('before-migration'); repository.fanOut();
    const queue = db.prepare('SELECT * FROM push_deliveries').all();
    migrateDatabase(db);
    assert.deepEqual(db.prepare('SELECT * FROM push_deliveries').all(), queue);
    const enrolled = repository.register(sub, token, 'v1');
    assert.ok(isInstallationUuid(enrolled.id));
    assert.deepEqual(repository.register(sub, token, 'v1'), enrolled);
    assert.equal(repository.resolveId(enrolled.id), 1);
    assert.equal(repository.allows(enrolled.id, [enrolled.id]), true);
    const other = repository.register(subscription('other'), credential(), 'v1');
    assert.notEqual(other.id, enrolled.id);
    assert.equal(repository.allows(other.id, [enrolled.id]), false);
    assert.equal(repository.claim([other.id]), null);
    assert.equal(repository.claim([enrolled.id])?.subscription_id, 1);
    repository.revoke(enrolled.id, token);
    assert.equal(db.prepare('SELECT active FROM push_subscriptions WHERE id = 1').pluck().get(), 0);
    // A still-running preceding release omits the new column when enrolling.
    insert.run('legacy-hash', 'https://web.push.apple.com/legacy', sub.keys.p256dh, sub.keys.auth, 'legacy-credential-hash');
    const legacyId = db.prepare("SELECT installation_id FROM push_subscriptions WHERE endpoint_hash = 'legacy-hash'").pluck().get();
    assert.ok(isInstallationUuid(legacyId));
    migrateDatabase(db);
    assert.equal(db.prepare("SELECT installation_id FROM push_subscriptions WHERE id = 1").pluck().get(), enrolled.id);
  } finally { db.close(); }
});

test('audiences accept UUIDs and reject numeric configuration', () => {
  const id = '184a1f93-09e2-430d-8016-1f0765693f00';
  assert.deepEqual(getPushConfig({ JGANTTS_PUSH_AUDIENCE: ` ${id.toUpperCase()} ` }, '').audience, [id]);
  for (const invalid of ['1', '0', '-1', '1e2', 'not-a-uuid', id + ',']) {
    assert.throws(() => getPushConfig({ JGANTTS_PUSH_AUDIENCE: invalid }, ''), /audience/);
  }
});

test('publishing over HTTP dispatches without a polling tick or test notification', async t => {
  const { db, repository, service, subscribe, draft } = fixture(t);
  subscribe('a'); draft('immediate');
  const cfg = config(); const sent: string[] = [];
  const worker = new PushWorker(repository, cfg, async (_subscription, payload) => { sent.push(JSON.parse(payload).eventId); });
  const server = createApp({ adminToken: 'admin-test', services: {
    posts: service, push: { repository, config: cfg, wake: () => worker.wake() },
  } }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { await worker.stop(); await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }); });
  const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin/posts/immediate/publish`, {
    method: 'POST', headers: { Authorization: 'Bearer admin-test', 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(response.status, 200);
  assert.deepEqual(sent, ['immediate']);
  assert.equal(db.prepare('SELECT state FROM push_deliveries').pluck().get(), 'accepted');
});

test('publication arriving during a send wakes another pass without overlapping or losing work', async t => {
  const { repository, service, subscribe, draft } = fixture(t);
  subscribe('a'); draft('first'); service.publish('first');
  let complete!: () => void; const sent: string[] = [];
  const worker = new PushWorker(repository, config(), async (_subscription, payload) => {
    sent.push(JSON.parse(payload).eventId);
    if (sent.length === 1) await new Promise<void>(resolve => { complete = resolve; });
  });
  const running = worker.runOnce();
  draft('second'); service.publish('second'); worker.wake(); worker.wake();
  assert.deepEqual(sent, ['first']);
  complete(); await running;
  assert.deepEqual(sent, ['first', 'second']);
  await worker.stop();
  draft('stopped'); service.publish('stopped'); worker.wake();
  await worker.runOnce();
  assert.deepEqual(sent, ['first', 'second']);
});

test('one wake drains multiple publication events and more than four recipients without another tick', async t => {
  const { db, repository, service, subscribe, draft } = fixture(t);
  for (let i = 0; i < 9; i++) subscribe(String(i));
  draft('batch-one'); service.publish('batch-one'); draft('batch-two'); service.publish('batch-two');
  let active = 0; let peak = 0; let sent = 0;
  const worker = new PushWorker(repository, config(), async () => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setImmediate(resolve));
    active--; sent++;
  });
  worker.wake(); await worker.runOnce();
  assert.equal(sent, 18); assert.equal(peak, 4);
  assert.equal(db.prepare("SELECT COUNT(*) FROM push_deliveries WHERE state = 'accepted'").pluck().get(), 18);
  await worker.stop();
});

test('dashboard is authenticated, read-only, and exposes event timing without subscription secrets', async t => {
  const { db, repository, service, subscribe, draft } = fixture(t);
  const id = subscribe('dashboard'); draft('queued'); service.publish('queued');
  draft('silent-dashboard'); service.publish('silent-dashboard', undefined, true);
  const cfg = config(); cfg.audience = [id];
  const server = createApp({ adminToken: 'dashboard-admin', services: { push: { repository, config: cfg } } }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin/push/dashboard`;
  assert.equal((await fetch(url)).status, 401);
  const headers = { Authorization: 'Bearer dashboard-admin' };
  const response = await fetch(url, { headers });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const initial = await response.json();
  assert.equal(initial.pendingEvents, 1);
  assert.equal(initial.events.find((e: any) => e.id === 'queued').total, 0);
  assert.equal(initial.events.find((e: any) => e.id === 'silent-dashboard').state, 'suppressed');
  assert.equal(db.prepare('SELECT COUNT(*) FROM push_deliveries').pluck().get(), 0, 'viewing must not wake or mutate the queue');
  await new PushWorker(repository, cfg, async () => {}).runOnce();
  const dashboard = await (await fetch(url, { headers })).json();
  assert.equal(dashboard.recentDeliveries[0].state, 'accepted');
  assert.ok(dashboard.recentDeliveries[0].acceptedAfterMs >= 0);
  assert.equal(dashboard.installations[0].id, id);
  assert.equal(dashboard.installations[0].allowed, true);
  assert.doesNotMatch(JSON.stringify(dashboard), /endpoint|credential|p256dh|payload_json|lease_token|privateKey|web.push.apple.com/);
});
