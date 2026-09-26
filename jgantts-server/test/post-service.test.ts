import assert from 'node:assert/strict';
import test from 'node:test';
import { openContentDatabase } from '../src/db/database';
import { PostConflictError } from '../src/posts/errors';
import { PostRepository } from '../src/posts/post-repository';
import { PostService } from '../src/posts/post-service';

test('reuses a historical slug repeatedly without breaking redirects or ownership', (t) => {
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const posts = new PostService(new PostRepository(database));
  const post = posts.createDraft({ slug: 'original', bodyMarkdown: 'A post' });
  posts.publish(post.id);
  for (const slug of ['renamed', 'original', 'final', 'renamed', 'final']) {
    assert.equal(posts.updateFromAuthor(post.id, { slug })?.slug, slug);
  }
  for (const slug of ['original', 'renamed', 'final']) {
    assert.equal(posts.findBySlug(slug)?.id, post.id);
    assert.equal(posts.findBySlug(slug)?.slug, 'final');
  }
  const other = posts.createDraft({ slug: 'other', bodyMarkdown: 'Another post' });
  for (const slug of ['original', 'renamed', 'final']) {
    assert.throws(() => posts.updateFromAuthor(other.id, { slug }), PostConflictError);
    assert.equal(posts.findById(other.id)?.slug, 'other');
  }
});
