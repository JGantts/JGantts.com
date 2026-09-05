import assert from 'node:assert/strict';
import test from 'node:test';
import type { ContentDatabase } from '../src/db/database';
import { openContentDatabase } from '../src/db/database';
import { PostRepository } from '../src/posts/post-repository';
import { PostService } from '../src/posts/post-service';
import { MastodonClient, MastodonRequestError, type MastodonClientLike } from '../src/syndication/mastodon-client';
import { buildMastodonStatus, MastodonSyndicationService } from '../src/syndication/mastodon-syndication-service';
import { OutboxWorker } from '../src/syndication/outbox-worker';
import { SyndicationRepository } from '../src/syndication/syndication-repository';
import type { MastodonStatusResult } from '../src/syndication/types';

class FakeMastodonClient implements MastodonClientLike {
  readonly edits: Array<{ id: string; key: string; text: string }> = [];
  readonly publications: Array<{ key: string; text: string }> = [];
  publishError: Error | null = null;
  result: MastodonStatusResult = { id: 'remote-123', url: 'https://mastodon.social/@jgantts/remote-123' };

  async getStatusCharacterLimit(): Promise<number> {
    return 80;
  }

  async publishStatus(text: string, key: string): Promise<MastodonStatusResult> {
    this.publications.push({ key, text });
    if (this.publishError) throw this.publishError;
    return this.result;
  }

  async editStatus(id: string, text: string, key: string): Promise<MastodonStatusResult> {
    this.edits.push({ id, key, text });
    return this.result;
  }
}

function fixture(): {
  database: ContentDatabase;
  posts: PostService;
  repository: SyndicationRepository;
  service: MastodonSyndicationService;
} {
  const database = openContentDatabase(':memory:');
  const postRepository = new PostRepository(database);
  const posts = new PostService(postRepository);
  const repository = new SyndicationRepository(database);
  const service = new MastodonSyndicationService(
    repository,
    posts,
    'https://jgantts.com',
    'https://mastodon.social',
    true,
  );
  return { database, posts, repository, service };
}

function publishedPost(posts: PostService): string {
  const post = posts.createDraft({
    slug: 'canonical-post',
    title: 'Canonical post',
    bodyMarkdown: 'This content belongs to the site.',
    excerpt: 'A short introduction',
  });
  posts.publish(post.id, '2026-09-04T12:00:00.000Z');
  return post.id;
}

test('builds a conservative Mastodon teaser within the instance limit', () => {
  const url = 'https://jgantts.com/posts/canonical-post';
  const status = buildMastodonStatus('A deliberately long introduction to the canonical article', url, 70);
  assert.ok(Array.from(status).length <= 70);
  assert.match(status, /…\n\nhttps:\/\/jgantts\.com\/posts\/canonical-post$/);
  assert.equal(buildMastodonStatus('', url, 70), url);
});

test('uses the Mastodon instance limit and sends authenticated idempotent status requests', async () => {
  const requests: Array<{ body: string | null; headers: Headers; method: string; url: string }> = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    requests.push({
      body: typeof init?.body === 'string' ? init.body : null,
      headers: new Headers(init?.headers),
      method: init?.method ?? 'GET',
      url,
    });
    if (url.endsWith('/api/v2/instance')) {
      return Response.json({ configuration: { statuses: { max_characters: 620 } } });
    }
    return Response.json({ id: 'status-id', url: 'https://mastodon.social/@jgantts/status-id' });
  };
  const client = new MastodonClient('https://mastodon.social', 'secret-token', fakeFetch);

  assert.equal(await client.getStatusCharacterLimit(), 620);
  assert.equal(await client.getStatusCharacterLimit(), 620);
  await client.publishStatus('A canonical link', 'stable-key');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].headers.get('authorization'), null);
  assert.equal(requests[1].headers.get('authorization'), 'Bearer secret-token');
  assert.equal(requests[1].headers.get('idempotency-key'), 'stable-key');
  assert.equal(requests[1].method, 'POST');
  assert.deepEqual(JSON.parse(requests[1].body ?? ''), {
    status: 'A canonical link',
    visibility: 'public',
  });
});

test('captures Mastodon rate-limit retry timing without exposing credentials', async () => {
  const fakeFetch: typeof fetch = async () => Response.json(
    { error: 'Rate limit exceeded' },
    { status: 429, headers: { 'retry-after': '30' } },
  );
  const client = new MastodonClient('https://mastodon.social', 'secret-token', fakeFetch);
  await assert.rejects(
    client.publishStatus('Post', 'key'),
    (error: unknown) => error instanceof MastodonRequestError
      && error.status === 429
      && error.retryAfterMs === 30_000
      && !error.message.includes('secret-token'),
  );
});

test('queues exactly one publication for a canonical post and rejects drafts', (t) => {
  const { database, posts, repository, service } = fixture();
  t.after(() => database.close());
  const draft = posts.createDraft({ slug: 'draft', bodyMarkdown: 'Not ready' });
  assert.throws(() => service.queue(draft.id), /Only published posts/);

  const postId = publishedPost(posts);
  const first = service.queue(postId);
  assert.equal(first.queued, true);
  assert.equal(first.syndication.state, 'pending');
  const firstJob = repository.claimNext(new Date('2100-09-04T12:01:00.000Z'));
  assert.ok(firstJob);
  assert.equal(firstJob.payload.canonicalUrl, 'https://jgantts.com/posts/canonical-post');
  assert.equal(firstJob.payload.idempotencyKey, first.syndication.idempotencyKey);

  posts.updateFromAuthor(postId, { bodyMarkdown: 'A later local revision' });
  const repeated = service.queue(postId, 'A different teaser');
  assert.equal(repeated.queued, false);
  assert.equal(repeated.syndication.id, first.syndication.id);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM syndications').get().count, 1);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM outbox_jobs').get().count, 1);
});

test('publishes a queued status and saves its remote identity', async (t) => {
  const { database, posts, repository, service } = fixture();
  t.after(() => database.close());
  const postId = publishedPost(posts);
  const queued = service.queue(postId, 'Read this on my site');
  const mastodon = new FakeMastodonClient();
  const worker = new OutboxWorker(repository, mastodon);

  assert.equal(await worker.runOnce(), true);
  assert.equal(mastodon.publications.length, 1);
  assert.match(mastodon.publications[0].text, /Read this on my site\n\nhttps:\/\/jgantts\.com/);
  assert.equal(mastodon.publications[0].key, queued.syndication.idempotencyKey);
  const result = repository.getById(queued.syndication.id);
  assert.equal(result?.state, 'published');
  assert.equal(result?.remoteStatusId, 'remote-123');
  assert.equal(result?.remoteUrl, mastodon.result.url);
  assert.equal(await worker.runOnce(), false);
});

test('retries uncertain failures with the same idempotency key', async (t) => {
  const { database, posts, repository, service } = fixture();
  t.after(() => database.close());
  const postId = publishedPost(posts);
  const queued = service.queue(postId);
  const mastodon = new FakeMastodonClient();
  mastodon.publishError = new MastodonRequestError('Connection ended after send.', null);
  const worker = new OutboxWorker(repository, mastodon);

  await worker.runOnce();
  assert.equal(repository.getById(queued.syndication.id)?.state, 'pending');
  database.prepare("UPDATE outbox_jobs SET available_at = '2000-01-01T00:00:00.000Z'").run();
  mastodon.publishError = null;
  await worker.runOnce();

  assert.equal(mastodon.publications.length, 2);
  assert.equal(mastodon.publications[0].key, mastodon.publications[1].key);
  assert.equal(repository.getById(queued.syndication.id)?.state, 'published');
});

test('reschedules rate-limited publications using Mastodon Retry-After', async (t) => {
  const { database, posts, repository, service } = fixture();
  t.after(() => database.close());
  const queued = service.queue(publishedPost(posts));
  const mastodon = new FakeMastodonClient();
  mastodon.publishError = new MastodonRequestError('Rate limited.', 429, 30_000);
  const before = Date.now();

  await new OutboxWorker(repository, mastodon).runOnce();

  const availableAt = database.prepare('SELECT available_at FROM outbox_jobs').pluck().get() as string;
  assert.ok(Date.parse(availableAt) >= before + 29_000);
  assert.equal(repository.getById(queued.syndication.id)?.state, 'pending');
});

test('fails authentication permanently and supports an explicit manual retry', async (t) => {
  const { database, posts, repository, service } = fixture();
  t.after(() => database.close());
  const postId = publishedPost(posts);
  const queued = service.queue(postId);
  const mastodon = new FakeMastodonClient();
  mastodon.publishError = new MastodonRequestError('Mastodon returned HTTP 401', 401);
  const worker = new OutboxWorker(repository, mastodon);

  await worker.runOnce();
  assert.equal(repository.getById(queued.syndication.id)?.state, 'failed');
  const retried = service.retry(postId);
  assert.equal(retried.state, 'pending');
  assert.equal(retried.attemptCount, 0);
  mastodon.publishError = null;
  await worker.runOnce();
  assert.equal(repository.getById(queued.syndication.id)?.state, 'published');
});

test('queues remote teaser edits only through the explicit edit operation', async (t) => {
  const { database, posts, repository, service } = fixture();
  t.after(() => database.close());
  const postId = publishedPost(posts);
  service.queue(postId);
  const mastodon = new FakeMastodonClient();
  const worker = new OutboxWorker(repository, mastodon);
  await worker.runOnce();

  posts.updateFromAuthor(postId, { title: 'Updated locally' });
  assert.equal(mastodon.edits.length, 0);
  service.queueEdit(postId, 'An explicitly updated teaser');
  service.queueEdit(postId, 'An explicitly updated teaser');
  assert.throws(
    () => service.queueEdit(postId, 'A different request while queued'),
    /different Mastodon teaser edit is already queued/,
  );
  assert.equal(database.prepare(`
    SELECT COUNT(*) AS count FROM outbox_jobs WHERE kind = 'mastodon.edit_status'
  `).get().count, 1);
  await worker.runOnce();
  assert.equal(mastodon.edits.length, 1);
  assert.equal(mastodon.edits[0].id, 'remote-123');
  assert.match(mastodon.edits[0].text, /An explicitly updated teaser/);
});

test('reclaims a processing job after a worker crash', (t) => {
  const { database, posts, repository, service } = fixture();
  t.after(() => database.close());
  service.queue(publishedPost(posts));
  const first = repository.claimNext(new Date('2100-09-04T12:00:00.000Z'));
  assert.ok(first);
  assert.equal(repository.claimNext(new Date('2100-09-04T12:04:59.000Z')), null);
  const reclaimed = repository.claimNext(new Date('2100-09-04T12:05:01.000Z'));
  assert.equal(reclaimed?.id, first.id);
  assert.equal(reclaimed?.attemptCount, 2);
});
