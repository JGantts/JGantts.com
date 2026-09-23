import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { openContentDatabase } from '../src/db/database';
import { MediaRepository } from '../src/media/media-repository';
import { MediaService } from '../src/media/media-service';
import { PostRepository } from '../src/posts/post-repository';
import { socialPreviewLayout } from '../src/social-preview/layout';
import { SocialPreviewRepository } from '../src/social-preview/social-preview-repository';
import { SocialPreviewService } from '../src/social-preview/social-preview-service';

function temporaryDirectory(t: test.TestContext): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jgantts-social-preview-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('defines complete deterministic collage layouts', () => {
  for (let count = 1; count <= 5; count += 1) {
    const tiles = socialPreviewLayout(count);
    assert.equal(tiles.length, count);
    for (const tile of tiles) {
      assert.ok(tile.x >= 0 && tile.y >= 0 && tile.width > 0 && tile.height > 0);
      assert.ok(tile.x + tile.width <= 1_200);
      assert.ok(tile.y + tile.height <= 630);
    }
  }
  assert.throws(() => socialPreviewLayout(0), RangeError);
  assert.throws(() => socialPreviewLayout(6), RangeError);
});

test('generates an immutable collage and detects when its inputs become stale', async (t) => {
  const root = temporaryDirectory(t);
  const mediaRoot = path.join(root, 'media');
  const database = openContentDatabase(path.join(root, 'content.sqlite'));
  t.after(() => database.close());
  const posts = new PostRepository(database);
  const post = posts.create({
    id: 'social-preview-post',
    slug: 'social-preview-post',
    title: 'A colorful trip',
    bodyMarkdown: 'Photos',
    bodyHtml: '<p>Photos</p>',
  });
  const mediaRepository = new MediaRepository(database);
  const media = new MediaService(mediaRepository, posts, mediaRoot);
  const colors = ['#cc3344', '#33aa66', '#3366cc'];
  const uploaded = [];
  for (const [index, color] of colors.entries()) {
    const buffer = await sharp({
      create: { width: 800 + index * 100, height: 600, channels: 3, background: color },
    }).png().toBuffer();
    uploaded.push(await media.uploadImage({ postId: post.id, altText: color, buffer }));
  }
  posts.update(post.id, { heroMediaId: uploaded[1].id });
  const previews = new SocialPreviewService(
    new SocialPreviewRepository(database), mediaRepository, posts, mediaRoot,
  );

  assert.equal(previews.status(post.id).state, 'missing');
  const generated = await previews.generate(post.id);
  assert.equal(generated.state, 'current');
  assert.deepEqual(
    new SocialPreviewRepository(database).getForPost(post.id)?.selectedMediaIds,
    [uploaded[1].id, uploaded[0].id, uploaded[2].id],
  );
  const urlMatch = generated.image?.url.match(/\/([a-f0-9]{32})\.jpg$/);
  assert.ok(urlMatch);
  const file = previews.getFile(post.id, urlMatch[1]);
  assert.ok(file);
  const metadata = await sharp(file.path).metadata();
  assert.deepEqual([metadata.format, metadata.width, metadata.height], ['jpeg', 1_200, 630]);

  posts.update(post.id, { heroMediaId: uploaded[2].id });
  assert.equal(previews.status(post.id).state, 'outdated');
  const regenerated = await previews.generate(post.id);
  assert.equal(regenerated.state, 'current');
  assert.notEqual(regenerated.image?.url, generated.image?.url);
  assert.ok(previews.getFile(post.id, urlMatch[1]), 'old immutable preview remains available');
});
