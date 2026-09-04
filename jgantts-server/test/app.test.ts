import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';
import { createApp } from '../src/app';
import { normalizeSiteOrigin, parsePort } from '../src/config';
import { upsertMeta } from '../src/site/html';

const TEMPLATE = `<!doctype html>
<html><head>
  <title>old</title>
  <meta content="old" name="description">
  <meta content="old" property="og:title">
</head><body><div id="app"></div></body></html>`;

interface TestResponse {
  body: string;
  headers: http.IncomingHttpHeaders;
  status: number | undefined;
}

function request(
  app: Express,
  pathname: string,
  options: { body?: string; headers?: http.OutgoingHttpHeaders; method?: string } = {},
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      const req = http.request({
        hostname: '127.0.0.1',
        port: address.port,
        path: pathname,
        method: options.method ?? 'GET',
        headers: options.headers,
      }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => { body += chunk; });
        res.on('end', () => {
          server.close();
          resolve({ body, headers: res.headers, status: res.statusCode });
        });
      });
      req.on('error', (error) => {
        server.close();
        reject(error);
      });
      req.end(options.body);
    });
  });
}

test('normalizes and validates SITE_ORIGIN', () => {
  assert.equal(normalizeSiteOrigin(' https://JGantts.com:443 '), 'https://jgantts.com');
  assert.throws(() => normalizeSiteOrigin('jgantts.com'), /absolute/);
  assert.throws(() => normalizeSiteOrigin('https://jgantts.com/a'), /only an origin/);
});

test('validates PORT', () => {
  assert.equal(parsePort(undefined), 3000);
  assert.equal(parsePort('0'), 0);
  assert.throws(() => parsePort('wat'), /PORT/);
  assert.throws(() => parsePort('65536'), /PORT/);
});

test('upserts metadata regardless of attribute order', () => {
  const html = upsertMeta(TEMPLATE, 'name', 'description', 'A & B');
  assert.match(html, /<meta name="description" content="A &amp; B" \/>/);
  assert.equal((html.match(/name="description"/g) ?? []).length, 1);
});

test('renders route metadata and clean canonical URLs behind a proxy', async () => {
  const app = createApp({ appHtmlTemplate: TEMPLATE, siteOrigin: '' });
  const response = await request(app, '/holmes/tips?utm_source=test', {
    headers: {
      'x-forwarded-host': 'www.jgantts.com',
      'x-forwarded-proto': 'https',
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers['x-powered-by'], undefined);
  assert.match(response.body, /<title>Holmes, Zachary<\/title>/);
  assert.match(response.body, /content="https:\/\/www\.jgantts\.com\/holmes\/tips"/);
  assert.doesNotMatch(response.body, /utm_source/);
});

test('does not let a protocol-relative request target replace the canonical origin', async () => {
  const app = createApp({ appHtmlTemplate: TEMPLATE, siteOrigin: 'https://jgantts.com' });
  const response = await request(app, '//attacker.example/path');

  assert.equal(response.status, 200);
  assert.match(response.body, /content="https:\/\/jgantts\.com\/\/attacker\.example\/path"/);
  assert.doesNotMatch(response.body, /content="https:\/\/attacker\.example/);
});

test('renders metadata for newer frontend routes', async () => {
  const app = createApp({ appHtmlTemplate: TEMPLATE, siteOrigin: 'https://jgantts.com' });
  const [kovyalo, photos] = await Promise.all([
    request(app, '/kovyalo/game'),
    request(app, '/photos/a-post'),
  ]);

  assert.match(kovyalo.body, /<title>Kovyálo<\/title>/);
  assert.match(kovyalo.body, /content="Kovyálo \| JGantts"/);
  assert.match(photos.body, /<title>JGantts Photos<\/title>/);
  assert.match(photos.body, /content="Photos \| JGantts"/);
});

test('renders the real build and serves real public files', async () => {
  const app = createApp({ siteOrigin: 'https://jgantts.com' });
  const [page, preview] = await Promise.all([
    request(app, '/holmes'),
    request(app, '/holmes-social-preview.svg'),
  ]);

  assert.equal(page.status, 200);
  assert.match(page.body, /<title>Holmes, Zachary<\/title>/);
  assert.doesNotMatch(page.body, /__[A-Z_]+__/);
  assert.equal(preview.status, 200);
  assert.match(String(preview.headers['content-type']), /image\/svg\+xml/);
});

test('exposes an API health endpoint before the SPA fallback', async () => {
  const app = createApp({ appHtmlTemplate: TEMPLATE, siteOrigin: 'https://jgantts.com' });
  const response = await request(app, '/api/health');

  assert.equal(response.status, 200);
  assert.match(String(response.headers['content-type']), /application\/json/);
  assert.deepEqual(JSON.parse(response.body), { status: 'ok' });
});

test('returns JSON 404 responses for unimplemented API routes', async () => {
  const app = createApp({ appHtmlTemplate: TEMPLATE, siteOrigin: 'https://jgantts.com' });
  const response = await request(app, '/api/future-resource');

  assert.equal(response.status, 404);
  assert.match(String(response.headers['content-type']), /application\/json/);
  assert.equal(JSON.parse(response.body).error.code, 'not_found');
  assert.doesNotMatch(response.body, /<html/i);
});

test('returns structured JSON errors for malformed API requests', async () => {
  const app = createApp({ appHtmlTemplate: TEMPLATE, siteOrigin: 'https://jgantts.com' });
  const response = await request(app, '/api/future-resource', {
    body: '{bad json',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  assert.equal(response.status, 400);
  assert.match(String(response.headers['content-type']), /application\/json/);
  assert.equal(JSON.parse(response.body).error.code, 'bad_request');
});

test('returns 404 for missing files instead of the SPA document', async () => {
  const app = createApp({ appHtmlTemplate: TEMPLATE, siteOrigin: 'https://jgantts.com' });
  const response = await request(app, '/missing.js');
  assert.equal(response.status, 404);
});

test('returns a non-cacheable 503 when the frontend build is missing', async () => {
  const app = createApp({ appHtmlTemplate: '', siteOrigin: '' });
  const response = await request(app, '/');
  assert.equal(response.status, 503);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.match(response.body, /doing his best/);
});
