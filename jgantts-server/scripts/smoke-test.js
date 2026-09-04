#!/usr/bin/env node

const assert = require('node:assert/strict');

const LIVE_ORIGIN = 'https://jgantts.com';
const HEALTH_ATTEMPTS = 10;
const HEALTH_RETRY_DELAY_MS = 2_000;
const REQUEST_TIMEOUT_MS = 10_000;

function normalizeOrigin(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`Smoke-test target must be an HTTP origin: ${value}`);
  }
  return url.origin;
}

async function fetchFrom(origin, pathname) {
  return fetch(new URL(pathname, `${origin}/`), {
    headers: { 'user-agent': 'jgantts-server-smoke-test/1.0' },
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function waitForHealth(origin) {
  let lastError;

  for (let attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchFrom(origin, '/api/health');
      const body = await response.text();
      assert.equal(response.status, 200, `health returned ${response.status}: ${body.slice(0, 200)}`);
      assert.match(response.headers.get('content-type') ?? '', /application\/json/i);
      assert.deepEqual(JSON.parse(body), { status: 'ok' });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < HEALTH_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, HEALTH_RETRY_DELAY_MS));
      }
    }
  }

  throw new Error(`${origin} did not become healthy`, { cause: lastError });
}

async function testOrigin(origin) {
  console.log(`Testing ${origin}`);
  await waitForHealth(origin);

  const build = await fetchFrom(origin, '/api/build');
  const buildInfo = await build.json();
  assert.equal(build.status, 200);
  assert.match(build.headers.get('content-type') ?? '', /application\/json/i);
  assert.match(buildInfo.commitId, /^(?:dev|[0-9a-f]{40,64})$/i);
  assert.equal(typeof buildInfo.commitMessage, 'string');
  assert.ok(buildInfo.commitMessage.length > 0);
  if (process.env.EXPECTED_COMMIT_SHA) {
    assert.equal(buildInfo.commitId, process.env.EXPECTED_COMMIT_SHA);
  }

  const home = await fetchFrom(origin, '/');
  const homeHtml = await home.text();
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-type') ?? '', /text\/html/i);
  assert.match(homeHtml, /<div id="app"><\/div>/);
  assert.doesNotMatch(homeHtml, /__[A-Z_]+__/);

  const holmes = await fetchFrom(origin, '/holmes?smoke_test=1');
  const holmesHtml = await holmes.text();
  assert.equal(holmes.status, 200);
  assert.match(holmesHtml, /<title>Holmes, Zachary<\/title>/);
  assert.doesNotMatch(holmesHtml, /smoke_test/);

  const missingApiRoute = await fetchFrom(origin, '/api/smoke-test-missing');
  const missingApiBody = await missingApiRoute.json();
  assert.equal(missingApiRoute.status, 404);
  assert.equal(missingApiBody.error?.code, 'not_found');

  const missingAsset = await fetchFrom(origin, '/smoke-test-missing.js');
  assert.equal(missingAsset.status, 404);

  console.log(`Passed ${origin}`);
}

async function startLocalServer() {
  const { createApp } = require('../dist/app');
  const server = createApp({ siteOrigin: '' }).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Could not determine the local smoke-test port.');
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}

async function main() {
  const argumentsSet = new Set(process.argv.slice(2));
  const useDefaults = argumentsSet.size === 0;
  const testLocal = useDefaults || argumentsSet.delete('--local');
  const testLive = useDefaults || argumentsSet.delete('--live');
  const explicitOrigins = [...argumentsSet].map(normalizeOrigin);

  let localServer;
  try {
    const origins = [...explicitOrigins];
    if (testLocal) {
      localServer = await startLocalServer();
      origins.unshift(localServer.origin);
    }
    if (testLive) {
      origins.push(LIVE_ORIGIN);
    }
    if (origins.length === 0) {
      throw new Error('Pass --local, --live, or an explicit HTTP origin.');
    }

    for (const origin of origins) {
      await testOrigin(origin);
    }
  } finally {
    await localServer?.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
