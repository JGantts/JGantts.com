import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { openContentDatabase } from '../src/db/database';
import { HealthService } from '../src/observability/health-service';
import { createStructuredLogger } from '../src/observability/logger';
import { ensureMediaDirectories } from '../src/storage';

test('emits structured logs while recursively redacting sensitive fields', () => {
  const lines: string[] = [];
  const logger = createStructuredLogger((line) => lines.push(line));
  logger.info('test_event', {
    authorization: 'Bearer private-value',
    nested: { accessToken: 'private-token', safe: 'visible' },
    requestBody: { title: 'private draft' },
    safe: 'visible',
  });

  assert.equal(lines.length, 1);
  const entry = JSON.parse(lines[0]) as Record<string, unknown>;
  assert.equal(entry.level, 'info');
  assert.equal(entry.event, 'test_event');
  assert.equal(entry.authorization, '[redacted]');
  assert.equal((entry.nested as Record<string, unknown>).accessToken, '[redacted]');
  assert.equal((entry.nested as Record<string, unknown>).safe, 'visible');
  assert.equal(entry.requestBody, '[redacted]');
  assert.doesNotMatch(lines[0], /private-value|private-token|private draft/);
});

test('reports core readiness and treats Mastodon backlog as non-fatal degradation', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jgantts-health-'));
  const mediaRoot = path.join(root, 'media');
  ensureMediaDirectories(mediaRoot);
  const database = openContentDatabase(path.join(root, 'content.sqlite'));
  t.after(() => {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const health = new HealthService(database, mediaRoot, true);
  const healthy = health.inspect(new Date('2026-09-05T12:00:00.000Z'));
  assert.equal(healthy.status, 'ok');
  assert.deepEqual(healthy.checks.database, { status: 'ok' });
  assert.deepEqual(healthy.checks.media, { status: 'ok' });
  assert.equal(healthy.checks.outbox.pending, 0);
  assert.deepEqual(healthy.checks.mastodon, { configured: true, status: 'ok' });

  database.prepare(`
    INSERT INTO outbox_jobs (
      kind, aggregate_id, payload_json, state, available_at, last_error, created_at, updated_at
    ) VALUES ('mastodon.publish_status', 'health-test', '{}', 'failed', ?, 'upstream unavailable', ?, ?)
  `).run(
    '2026-09-05T11:00:00.000Z',
    '2026-09-05T11:00:00.000Z',
    '2026-09-05T11:00:00.000Z',
  );
  const degraded = health.inspect(new Date('2026-09-05T12:00:00.000Z'));
  assert.equal(degraded.status, 'degraded');
  assert.equal(degraded.checks.outbox.failed, 1);
  assert.equal(degraded.checks.outbox.status, 'degraded');
  assert.equal(degraded.checks.mastodon.status, 'degraded');
});

test('reports missing writable media storage as an unhealthy core dependency', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jgantts-health-missing-'));
  const database = openContentDatabase(path.join(root, 'content.sqlite'));
  t.after(() => {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const report = new HealthService(database, path.join(root, 'missing-media'), false).inspect();
  assert.equal(report.status, 'unhealthy');
  assert.equal(report.checks.media.status, 'unhealthy');
  assert.deepEqual(report.checks.mastodon, { configured: false, status: 'disabled' });
});
