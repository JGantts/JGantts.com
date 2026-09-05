import assert from 'node:assert/strict';
import test from 'node:test';
import { CommentCacheRepository } from '../src/comments/comment-cache-repository';
import { MastodonCommentsService } from '../src/comments/mastodon-comments-service';
import type { ContentDatabase } from '../src/db/database';
import { openContentDatabase } from '../src/db/database';
import { PostRepository } from '../src/posts/post-repository';
import { PostService } from '../src/posts/post-service';
import type { MastodonCommentsClientLike } from '../src/syndication/mastodon-client';
import { MastodonSyndicationService } from '../src/syndication/mastodon-syndication-service';
import { SyndicationRepository } from '../src/syndication/syndication-repository';
import type { MastodonStatusContext } from '../src/syndication/types';

class FakeCommentsClient implements MastodonCommentsClientLike {
  calls = 0;
  error: Error | null = null;

  constructor(readonly context: MastodonStatusContext) {}

  async getStatusContext(): Promise<MastodonStatusContext> {
    this.calls += 1;
    if (this.error) throw this.error;
    return this.context;
  }
}

function status(input: {
  content?: string;
  id: string;
  parentId?: string | null;
  url?: string;
}): Record<string, unknown> {
  return {
    account: {
      acct: 'person@example.social',
      avatar_static: 'https://cdn.example.social/avatar.png',
      display_name: '<Person>',
      url: 'https://example.social/@person',
      username: 'person',
    },
    content: input.content ?? '<p>A thoughtful reply</p>',
    created_at: '2026-09-04T13:00:00.000Z',
    id: input.id,
    in_reply_to_id: input.parentId ?? 'root-status',
    media_attachments: [{
      description: 'A useful diagram',
      preview_url: 'https://cdn.example.social/preview.png',
      type: 'image',
      url: 'https://cdn.example.social/original.png',
    }, {
      preview_url: 'http://insecure.example/preview.png',
      type: 'image',
      url: 'http://insecure.example/original.png',
    }],
    url: input.url ?? `https://example.social/@person/${input.id}`,
  };
}

function fixture(): {
  database: ContentDatabase;
  postId: string;
  repository: SyndicationRepository;
} {
  const database = openContentDatabase(':memory:');
  const postRepository = new PostRepository(database);
  const posts = new PostService(postRepository);
  const post = posts.createDraft({ slug: 'discussion-post', bodyMarkdown: 'Canonical' });
  posts.publish(post.id, '2026-09-04T12:00:00.000Z');
  const repository = new SyndicationRepository(database);
  const syndication = new MastodonSyndicationService(
    repository,
    posts,
    'https://jgantts.com',
    'https://mastodon.social',
    true,
  ).queue(post.id);
  const job = repository.claimNext(new Date('2100-01-01T00:00:00.000Z'));
  assert.ok(job);
  repository.completePublication(job, {
    id: 'root-status',
    url: 'https://mastodon.social/@jgantts/root-status',
  }, '2026-09-04T12:01:00.000Z');
  assert.equal(syndication.syndication.id, job.payload.syndicationId);
  return { database, postId: post.id, repository };
}

test('normalizes, sanitizes, and preserves Mastodon reply relationships', async (t) => {
  const { database, postId, repository } = fixture();
  t.after(() => database.close());
  const client = new FakeCommentsClient({
    ancestors: [],
    descendants: [
      status({
        content: '<p>Hello <a href="javascript:alert(1)">bad link</a><script>bad()</script></p>',
        id: 'reply-1',
      }),
      status({ id: 'reply-2', parentId: 'reply-1' }),
      status({ id: 'orphan', parentId: 'missing-parent' }),
      status({ id: 'unsafe-url', url: 'http://example.social/unsafe' }),
    ],
  });
  const service = new MastodonCommentsService(
    new CommentCacheRepository(database),
    repository,
    client,
  );

  const result = await service.getForPost(postId, new Date('2026-09-04T14:00:00.000Z'));
  assert.equal(result.state, 'available');
  assert.equal(result.comments.length, 3);
  const first = result.comments.find((comment) => comment.id === 'reply-1');
  const child = result.comments.find((comment) => comment.id === 'reply-2');
  const orphan = result.comments.find((comment) => comment.id === 'orphan');
  assert.ok(first && child && orphan);
  assert.doesNotMatch(first.contentHtml, /javascript:|script|bad\(\)/i);
  assert.match(first.contentHtml, /rel="nofollow noopener noreferrer"/);
  assert.equal(first.attachments.length, 1);
  assert.equal(child.parentId, 'reply-1');
  assert.equal(child.orphaned, false);
  assert.equal(orphan.parentId, null);
  assert.equal(orphan.orphaned, true);
  assert.equal(first.account.displayName, '<Person>');
});

test('uses fresh cache and serves stale replies when Mastodon fails', async (t) => {
  const { database, postId, repository } = fixture();
  t.after(() => database.close());
  const client = new FakeCommentsClient({ ancestors: [], descendants: [status({ id: 'cached' })] });
  const service = new MastodonCommentsService(
    new CommentCacheRepository(database),
    repository,
    client,
  );

  const first = await service.getForPost(postId, new Date('2026-09-04T14:00:00.000Z'));
  const cached = await service.getForPost(postId, new Date('2026-09-04T14:01:00.000Z'));
  assert.deepEqual(cached, first);
  assert.equal(client.calls, 1);

  client.error = new Error('Mastodon is offline');
  const stale = await service.getForPost(postId, new Date('2026-09-04T14:03:00.000Z'));
  assert.equal(stale.state, 'available');
  assert.equal(stale.stale, true);
  assert.equal(stale.comments[0].id, 'cached');
  assert.equal(client.calls, 2);
});

test('represents unavailable and unsyndicated discussions without inventing comments', async (t) => {
  const { database, postId, repository } = fixture();
  t.after(() => database.close());
  const unavailable = await new MastodonCommentsService(
    new CommentCacheRepository(database),
    repository,
    null,
  ).getForPost(postId);
  assert.deepEqual(unavailable, {
    comments: [],
    fetchedAt: null,
    remoteUrl: 'https://mastodon.social/@jgantts/root-status',
    stale: false,
    state: 'unavailable',
    truncated: false,
  });

  const postRepository = new PostRepository(database);
  const posts = new PostService(postRepository);
  const localOnly = posts.createDraft({ slug: 'local-only', bodyMarkdown: 'Local only' });
  posts.publish(localOnly.id);
  const notSyndicated = await new MastodonCommentsService(
    new CommentCacheRepository(database),
    repository,
    null,
  ).getForPost(localOnly.id);
  assert.equal(notSyndicated.state, 'not_syndicated');
  assert.equal(notSyndicated.remoteUrl, null);
});

test('labels oversized Mastodon contexts as truncated', async (t) => {
  const { database, postId, repository } = fixture();
  t.after(() => database.close());
  const client = new FakeCommentsClient({
    ancestors: [],
    descendants: Array.from({ length: 501 }, (_, index) => status({ id: `reply-${index}` })),
  });
  const result = await new MastodonCommentsService(
    new CommentCacheRepository(database),
    repository,
    client,
  ).getForPost(postId);
  assert.equal(result.comments.length, 500);
  assert.equal(result.truncated, true);
});
