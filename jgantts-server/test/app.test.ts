import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';
import { createApp } from '../src/app';
import { DEV_BUILD_INFO, loadBuildInfo } from '../src/build-info';
import { getRuntimeConfig, normalizeSiteOrigin, parsePort, PRODUCTION_DATA_ROOT } from '../src/config';
import { openContentDatabase } from '../src/db/database';
import { PostRepository } from '../src/posts/post-repository';
import { PostService } from '../src/posts/post-service';
import { upsertMeta } from '../src/site/html';

const TEMPLATE = `<!doctype html>
<html><head>
  <title>old</title>
  <meta content="old" name="description">
  <meta content="old" property="og:title">
</head><body><div id="app"></div></body></html>`;

const BUILD_INFO = {
  commitId: '0123456789abcdef0123456789abcdef01234567',
  commitMessage: 'Test build metadata endpoint',
};

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

test('resolves safe content storage paths by environment', () => {
  const production = getRuntimeConfig({ NODE_ENV: 'production' });
  assert.equal(production.dataRoot, PRODUCTION_DATA_ROOT);
  assert.equal(production.databasePath, `${PRODUCTION_DATA_ROOT}/content.sqlite`);
  assert.equal(production.mediaRoot, `${PRODUCTION_DATA_ROOT}/media`);

  assert.throws(() => getRuntimeConfig({
    NODE_ENV: 'production',
    JGANTTS_DATA_ROOT: `${process.cwd()}/jgantts-server/runtime-content`,
  }), /outside the deployed application directory/);
});

test('uses explicit build strings in development', () => {
  assert.deepEqual(
    loadBuildInfo('/path/that/does/not/exist', { NODE_ENV: 'development' }),
    DEV_BUILD_INFO,
  );
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

test('returns full build information through the API', async () => {
  const app = createApp({
    appHtmlTemplate: TEMPLATE,
    buildInfo: BUILD_INFO,
    siteOrigin: 'https://jgantts.com',
  });
  const response = await request(app, '/api/build');

  assert.equal(response.status, 200);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.deepEqual(JSON.parse(response.body), BUILD_INFO);
});

test('lists only published posts with stable cursor pagination', async (t) => {
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const repository = new PostRepository(database);
  const posts = new PostService(repository);
  const app = createApp({
    appHtmlTemplate: TEMPLATE,
    services: { posts },
    siteOrigin: 'https://jgantts.com',
  });
  repository.create({
    id: 'published-1', slug: 'newest', bodyMarkdown: 'Newest', bodyHtml: '<p>Newest</p>',
    status: 'published', publishedAt: '2026-09-04T12:00:00.000Z',
  });
  repository.create({
    id: 'published-2', slug: 'middle', bodyMarkdown: 'Middle', bodyHtml: '<p>Middle</p>',
    status: 'published', publishedAt: '2026-09-04T11:00:00.000Z',
  });
  repository.create({
    id: 'published-3', slug: 'oldest', bodyMarkdown: 'Oldest', bodyHtml: '<p>Oldest</p>',
    status: 'published', publishedAt: '2026-09-04T10:00:00.000Z',
  });
  repository.create({
    id: 'draft-1', slug: 'private-draft', bodyMarkdown: 'Draft', bodyHtml: '<p>Draft</p>',
  });

  const firstResponse = await request(app, '/api/posts?limit=2');
  const firstPage = JSON.parse(firstResponse.body) as { items: Array<{ id: string }>; nextCursor: string };
  assert.equal(firstResponse.status, 200);
  assert.deepEqual(firstPage.items.map((post) => post.id), ['published-1', 'published-2']);
  assert.ok(firstPage.nextCursor);

  const secondResponse = await request(
    app,
    `/api/posts?limit=2&cursor=${encodeURIComponent(firstPage.nextCursor)}`,
  );
  const secondPage = JSON.parse(secondResponse.body) as { items: Array<{ id: string }>; nextCursor: null };
  assert.deepEqual(secondPage.items.map((post) => post.id), ['published-3']);
  assert.equal(secondPage.nextCursor, null);

  const invalidResponse = await request(app, '/api/posts?limit=0');
  assert.equal(invalidResponse.status, 400);
});

test('gets published posts through current and prior slugs without exposing drafts', async (t) => {
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const repository = new PostRepository(database);
  const posts = new PostService(repository);
  const app = createApp({
    appHtmlTemplate: TEMPLATE,
    services: { posts },
    siteOrigin: 'https://jgantts.com',
  });
  repository.create({
    id: 'published', slug: 'original-slug', bodyMarkdown: 'Public', bodyHtml: '<p>Public</p>',
    status: 'published', publishedAt: '2026-09-04T12:00:00.000Z',
  });
  repository.update('published', { slug: 'canonical-slug' });
  repository.create({
    id: 'draft', slug: 'draft-slug', bodyMarkdown: 'Draft', bodyHtml: '<p>Draft</p>',
  });

  const priorSlug = await request(app, '/api/posts/original-slug');
  assert.equal(priorSlug.status, 200);
  assert.equal(priorSlug.headers['content-location'], '/api/posts/canonical-slug');
  assert.equal(JSON.parse(priorSlug.body).slug, 'canonical-slug');
  assert.equal((await request(app, '/api/posts/draft-slug')).status, 404);
  assert.equal((await request(app, '/api/posts/missing')).status, 404);
});

test('reads centralized build information for every API request', async () => {
  let currentBuildInfo = BUILD_INFO;
  const app = createApp({
    appHtmlTemplate: TEMPLATE,
    buildInfoProvider: () => currentBuildInfo,
    siteOrigin: 'https://jgantts.com',
  });

  const firstResponse = await request(app, '/api/build');
  currentBuildInfo = {
    commitId: 'fedcba9876543210fedcba9876543210fedcba98',
    commitMessage: 'Updated centralized build information',
  };
  const secondResponse = await request(app, '/api/build');

  assert.deepEqual(JSON.parse(firstResponse.body), BUILD_INFO);
  assert.deepEqual(JSON.parse(secondResponse.body), currentBuildInfo);
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
