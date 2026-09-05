import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';
import sharp from 'sharp';
import { createApp } from '../src/app';
import { DEV_BUILD_INFO, loadBuildInfo } from '../src/build-info';
import { getRuntimeConfig, normalizeSiteOrigin, parsePort, PRODUCTION_DATA_ROOT } from '../src/config';
import { openContentDatabase } from '../src/db/database';
import { MediaRepository } from '../src/media/media-repository';
import { MediaService } from '../src/media/media-service';
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
  options: { body?: Buffer | string; headers?: http.OutgoingHttpHeaders; method?: string } = {},
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

function multipartBody(
  boundary: string,
  fields: Record<string, string>,
  file: { content: Buffer; contentType: string; filename: string },
): Buffer {
  const parts: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
    ));
  }
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.filename}"\r\n`
      + `Content-Type: ${file.contentType}\r\n\r\n`,
  ));
  parts.push(file.content, Buffer.from(`\r\n--${boundary}--\r\n`));
  return Buffer.concat(parts);
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

test('protects admin routes and creates, edits, and publishes sanitized posts', async (t) => {
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const posts = new PostService(new PostRepository(database));
  const app = createApp({
    adminToken: 'test-admin-secret',
    appHtmlTemplate: TEMPLATE,
    services: { posts },
    siteOrigin: 'https://jgantts.com',
  });
  const body = JSON.stringify({
    slug: 'first-local-post',
    title: 'First local post',
    bodyMarkdown: '# Hello\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(2)) **world**',
    excerpt: 'A first post',
  });

  assert.equal((await request(app, '/api/admin/posts', {
    body,
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })).status, 401);

  const createdResponse = await request(app, '/api/admin/posts', {
    body,
    headers: {
      authorization: 'Bearer test-admin-secret',
      'content-type': 'application/json',
    },
    method: 'POST',
  });
  assert.equal(createdResponse.status, 201);
  const created = JSON.parse(createdResponse.body) as { bodyHtml: string; id: string; status: string };
  assert.equal(created.status, 'draft');
  assert.match(created.bodyHtml, /<h1>Hello<\/h1>/);
  assert.match(created.bodyHtml, /<strong>world<\/strong>/);
  assert.doesNotMatch(created.bodyHtml, /script|javascript:/i);
  assert.equal((await request(app, '/api/posts/first-local-post')).status, 404);

  const updatedResponse = await request(app, `/api/admin/posts/${created.id}`, {
    body: JSON.stringify({ slug: 'canonical-local-post', bodyMarkdown: 'Updated' }),
    headers: {
      authorization: 'Bearer test-admin-secret',
      'content-type': 'application/json',
    },
    method: 'PATCH',
  });
  assert.equal(updatedResponse.status, 200);
  assert.equal(JSON.parse(updatedResponse.body).bodyHtml, '<p>Updated</p>\n');

  const publishedResponse = await request(app, `/api/admin/posts/${created.id}/publish`, {
    headers: { authorization: 'Bearer test-admin-secret' },
    method: 'POST',
  });
  assert.equal(publishedResponse.status, 200);
  assert.equal(JSON.parse(publishedResponse.body).status, 'published');
  assert.equal((await request(app, '/api/posts/canonical-local-post')).status, 200);
  assert.equal((await request(app, '/api/posts/first-local-post')).status, 200);
});

test('renders canonical post HTML, redirects old slugs, and preserves publication statuses', async (t) => {
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
    id: 'canonical-post',
    title: 'A canonical <post>',
    slug: 'first-canonical-slug',
    bodyMarkdown: 'Owned here',
    bodyHtml: '<p>Owned here</p>',
    excerpt: 'The canonical description.',
    status: 'published',
    createdAt: '2026-09-04T10:00:00.000Z',
    publishedAt: '2026-09-04T10:00:00.000Z',
  });
  repository.update('canonical-post', { slug: 'canonical-post' }, '2026-09-04T11:00:00.000Z');
  repository.create({
    id: 'draft-page', slug: 'draft-page', bodyMarkdown: 'Draft', bodyHtml: '<p>Draft</p>',
  });
  repository.create({
    id: 'archived-page', slug: 'archived-page', bodyMarkdown: 'Gone', bodyHtml: '<p>Gone</p>',
    status: 'archived',
  });

  const response = await request(app, '/posts/canonical-post?tracking=ignored');
  assert.equal(response.status, 200);
  assert.match(response.body, /<title>A canonical &lt;post&gt; \| JGantts<\/title>/);
  assert.match(response.body, /property="og:type" content="article"/);
  assert.match(response.body, /rel="canonical" href="https:\/\/jgantts\.com\/posts\/canonical-post"/);
  assert.match(response.body, /property="article:published_time"/);
  assert.match(response.body, /type="application\/ld\+json"/);
  assert.match(response.body, /data-server-rendered-post/);
  assert.match(response.body, /<p>Owned here<\/p>/);
  assert.match(response.body, /id="__POST_DATA__"/);
  assert.doesNotMatch(response.body, /<h1>A canonical <post><\/h1>/);

  const redirect = await request(app, '/posts/first-canonical-slug');
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.location, '/posts/canonical-post');
  assert.equal((await request(app, '/posts/draft-page')).status, 404);
  assert.equal((await request(app, '/posts/archived-page')).status, 410);
  assert.equal((await request(app, '/posts/missing-page')).status, 404);
});

test('generates Atom and sitemap discovery documents from published posts', async (t) => {
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const repository = new PostRepository(database);
  const posts = new PostService(repository);
  repository.create({
    id: 'feed-post', title: 'Feed & sitemap', slug: 'feed-post',
    bodyMarkdown: 'Discoverable', bodyHtml: '<p>Discoverable</p>',
    excerpt: 'Found everywhere', status: 'published',
    publishedAt: '2026-09-04T12:00:00.000Z',
  });
  repository.create({
    id: 'feed-draft', slug: 'feed-draft', bodyMarkdown: 'Hidden', bodyHtml: '<p>Hidden</p>',
  });
  const app = createApp({ appHtmlTemplate: TEMPLATE, services: { posts }, siteOrigin: 'https://jgantts.com' });

  const feed = await request(app, '/feed.xml');
  assert.equal(feed.status, 200);
  assert.match(String(feed.headers['content-type']), /application\/atom\+xml/);
  assert.match(feed.body, /Feed &amp; sitemap/);
  assert.match(feed.body, /https:\/\/jgantts\.com\/posts\/feed-post/);
  assert.doesNotMatch(feed.body, /feed-draft/);

  const sitemap = await request(app, '/sitemap.xml');
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.body, /https:\/\/jgantts\.com\/posts\/feed-post/);
  assert.doesNotMatch(sitemap.body, /feed-draft/);
});

test('returns safe failures for disabled admin API and invalid author input', async (t) => {
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const posts = new PostService(new PostRepository(database));
  const disabledApp = createApp({ appHtmlTemplate: TEMPLATE, services: { posts } });
  const disabled = await request(disabledApp, '/api/admin/posts', {
    body: '{}', headers: { 'content-type': 'application/json' }, method: 'POST',
  });
  assert.equal(disabled.status, 503);
  assert.equal(JSON.parse(disabled.body).error.code, 'admin_unavailable');

  const app = createApp({ adminToken: 'secret', appHtmlTemplate: TEMPLATE, services: { posts } });
  const invalid = await request(app, '/api/admin/posts', {
    body: JSON.stringify({ slug: 'Not Valid', bodyMarkdown: 'Hello' }),
    headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
    method: 'POST',
  });
  assert.equal(invalid.status, 400);

  const unknown = await request(app, '/api/admin/posts', {
    body: JSON.stringify({ slug: 'valid', bodyMarkdown: 'Hello', status: 'published' }),
    headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
    method: 'POST',
  });
  assert.equal(unknown.status, 400);
});

test('uploads local media and serves immutable originals and derivatives', async (t) => {
  const database = openContentDatabase(':memory:');
  const mediaRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jgantts-api-media-'));
  t.after(() => {
    database.close();
    fs.rmSync(mediaRoot, { recursive: true, force: true });
  });
  const postRepository = new PostRepository(database);
  postRepository.create({
    id: 'media-api-post', slug: 'media-api-post', bodyMarkdown: 'Photo', bodyHtml: '<p>Photo</p>',
  });
  const media = new MediaService(new MediaRepository(database), postRepository, mediaRoot);
  const app = createApp({
    adminToken: 'media-secret',
    appHtmlTemplate: TEMPLATE,
    services: { media, posts: new PostService(postRepository) },
  });
  const image = await sharp({
    create: { width: 24, height: 12, channels: 3, background: '#884422' },
  }).png().toBuffer();
  const boundary = 'jgantts-test-boundary';
  const body = multipartBody(boundary, {
    postId: 'media-api-post',
    altText: 'A brown test rectangle',
    displayOrder: '1',
  }, { content: image, contentType: 'image/png', filename: 'test.png' });

  const uploadedResponse = await request(app, '/api/admin/media', {
    body,
    headers: {
      authorization: 'Bearer media-secret',
      'content-length': body.length,
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    method: 'POST',
  });
  assert.equal(uploadedResponse.status, 201);
  const uploaded = JSON.parse(uploadedResponse.body) as {
    originalPath?: string;
    derivatives?: unknown;
    urls: { large: string; original: string; thumbnail: string };
  };
  assert.equal(uploaded.originalPath, undefined);
  assert.equal(uploaded.derivatives, undefined);
  assert.equal(uploadedResponse.headers.location, uploaded.urls.original);

  const original = await request(app, uploaded.urls.original);
  assert.equal(original.status, 200);
  assert.match(String(original.headers['content-type']), /image\/png/);
  assert.match(String(original.headers['cache-control']), /immutable/);
  const derivative = await request(app, uploaded.urls.large);
  assert.equal(derivative.status, 200);
  assert.match(String(derivative.headers['content-type']), /image\/webp/);

  postRepository.update('media-api-post', {
    status: 'published', publishedAt: '2026-09-04T12:00:00.000Z',
  });
  const postResponse = await request(app, '/api/posts/media-api-post');
  const post = JSON.parse(postResponse.body) as { media: Array<{ altText: string; urls: unknown }> };
  assert.equal(post.media.length, 1);
  assert.equal(post.media[0].altText, 'A brown test rectangle');
  assert.ok(post.media[0].urls);

  const canonicalPage = await request(app, '/posts/media-api-post');
  assert.equal(canonicalPage.status, 200);
  assert.match(canonicalPage.body, new RegExp(uploaded.urls.large.replaceAll('/', '\\/')));
  assert.match(canonicalPage.body, /twitter:card" content="summary_large_image"/);
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
