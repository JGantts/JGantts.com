import assert from 'node:assert/strict';
import test from 'node:test';
import type { Post } from '../src/posts/types';
import type { PublicMedia } from '../src/media/media-service';
import { PREVIEW_SCHEMA_VERSION, previewTokenFor, resolvePostPreview } from '../src/site/post-preview';

function post(changes: Partial<Post> = {}): Post {
  return {
    id: 'preview-post',
    description: null,
    location: 'New York, NY',
    date: 20260907,
    time: '09:30',
    title: 'Preview title',
    slug: 'preview-post',
    bodyMarkdown: 'First body line\n\nSecond body line',
    bodyHtml: '<p>First body line</p><p>Second body line</p>',
    excerpt: null,
    contentWarning: null,
    status: 'published',
    heroMediaId: null,
    createdAt: '2026-09-07T00:00:00.000Z',
    publishedAt: '2026-09-07T00:00:00.000Z',
    updatedAt: '2026-09-07T00:00:00.000Z',
    ...changes,
  };
}

test('builds deterministic preview tokens from the rendered preview model', () => {
  assert.equal(PREVIEW_SCHEMA_VERSION, 1);
  const first = resolvePostPreview(post(), []);
  const repeated = resolvePostPreview(post(), []);
  assert.deepEqual(repeated, first);
  assert.equal(
    first.description,
    'Preview title\nFirst body line\nNew York, NY\n2026, September 7th, 09:30 in the morning',
  );
  assert.match(first.token, /^[0-9a-f]{16}$/);

  assert.notEqual(resolvePostPreview(post({ title: 'Changed title' }), []).token, first.token);
  assert.notEqual(resolvePostPreview(post({ bodyMarkdown: 'Changed body' }), []).token, first.token);
  assert.notEqual(resolvePostPreview(post({ location: 'Queens, NY' }), []).token, first.token);
  assert.equal(
    resolvePostPreview(post({ bodyMarkdown: 'First body line\nDifferent second line' }), []).token,
    first.token,
  );
  assert.notEqual(previewTokenFor(first, PREVIEW_SCHEMA_VERSION + 1), first.token);
});

test('includes the selected social image and handles Unicode and empty posts', () => {
  const image = {
    id: 'hero',
    height: 800,
    mimeType: 'image/jpeg',
    renditions: [{ format: 'jpeg', height: 630, url: '/media/hero/social', width: 1200 }],
    urls: { original: '/media/hero/original' },
    width: 1200,
  } as unknown as PublicMedia;
  const withImage = resolvePostPreview(post({ heroMediaId: 'hero', title: 'Kovyálo' }), [image]);
  assert.equal(withImage.cardType, 'summary_large_image');
  assert.equal(withImage.image?.url, '/media/hero/social');
  assert.notEqual(withImage.token, resolvePostPreview(post({ title: 'Kovyálo' }), []).token);

  const changedImage = {
    ...image,
    renditions: [{ format: 'jpeg', height: 630, url: '/media/hero/social?rev=2', width: 1200 }],
  } as unknown as PublicMedia;
  assert.notEqual(withImage.token, resolvePostPreview(post({ heroMediaId: 'hero', title: 'Kovyálo' }), [changedImage]).token);

  const empty = resolvePostPreview(post({ bodyMarkdown: '', location: null, title: null, date: null, time: null }), []);
  assert.equal(empty.description, 'A post from Jacob Gantt on JGantts.com.');
});
