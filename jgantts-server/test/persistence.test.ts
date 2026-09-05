import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';
import sharp from 'sharp';
import { backupContent } from '../src/db/backup';
import { inTransaction, openContentDatabase } from '../src/db/database';
import { migrations, migrateDatabase } from '../src/db/migrations';
import { MediaRepository } from '../src/media/media-repository';
import { MediaService } from '../src/media/media-service';
import { PostRepository } from '../src/posts/post-repository';
import { ensureMediaDirectories } from '../src/storage';

function temporaryDirectory(t: test.TestContext): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jgantts-content-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('configures and migrates a file database idempotently', (t) => {
  const root = temporaryDirectory(t);
  const databasePath = path.join(root, 'content.sqlite');
  const database = openContentDatabase(databasePath);
  t.after(() => database.close());

  assert.equal(database.pragma('foreign_keys', { simple: true }), 1);
  assert.equal(database.pragma('journal_mode', { simple: true }), 'wal');
  assert.equal(database.pragma('busy_timeout', { simple: true }), 5000);
  assert.equal(
    database.prepare('SELECT COUNT(*) FROM schema_migrations').pluck().get(),
    migrations.length,
  );

  migrateDatabase(database);
  assert.equal(
    database.prepare('SELECT COUNT(*) FROM schema_migrations').pluck().get(),
    migrations.length,
  );
});

test('upgrades an existing version-one production schema with optional titles', (t) => {
  const root = temporaryDirectory(t);
  const databasePath = path.join(root, 'content.sqlite');
  const oldDatabase = new Database(databasePath);
  oldDatabase.exec(`
    CREATE TABLE schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT;
  `);
  oldDatabase.exec(migrations[0].sql);
  oldDatabase.prepare(`
    INSERT INTO schema_migrations (version, name, applied_at) VALUES (1, ?, ?)
  `).run(migrations[0].name, '2026-09-04T00:00:00.000Z');
  oldDatabase.prepare(`
    INSERT INTO posts (
      id, slug, body_markdown, body_html, status, created_at, updated_at
    ) VALUES ('old-post', 'old-post', 'Old', '<p>Old</p>', 'published', ?, ?)
  `).run('2026-09-04T12:00:00.000Z', '2026-09-04T12:00:00.000Z');
  oldDatabase.close();

  const upgraded = openContentDatabase(databasePath);
  t.after(() => upgraded.close());
  const post = new PostRepository(upgraded).getBySlug('old-post');
  assert.equal(post?.title, null);
  assert.equal(
    upgraded.prepare('SELECT COUNT(*) FROM schema_migrations').pluck().get(),
    migrations.length,
  );
});

test('transaction helper rolls back the complete operation', (t) => {
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());

  assert.throws(() => inTransaction(database, () => {
    database.prepare(`
      INSERT INTO posts (
        id, slug, body_markdown, body_html, status, created_at, updated_at
      ) VALUES ('rollback', 'rollback', '', '', 'draft', '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z')
    `).run();
    throw new Error('abort');
  }), /abort/);

  assert.equal(database.prepare('SELECT COUNT(*) FROM posts').pluck().get(), 0);
});

test('post repository creates, updates, versions, and resolves prior slugs', (t) => {
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const posts = new PostRepository(database);

  const created = posts.create({
    id: '01TESTPOST0000000000000000',
    slug: 'first-slug',
    bodyMarkdown: 'Hello',
    bodyHtml: '<p>Hello</p>',
    createdAt: '2026-09-04T12:00:00.000Z',
  });
  assert.equal(created.status, 'draft');
  assert.equal(posts.getBySlug('first-slug')?.id, created.id);

  const updated = posts.update(created.id, {
    slug: 'better-slug',
    bodyMarkdown: 'Hello again',
    bodyHtml: '<p>Hello again</p>',
  }, '2026-09-04T13:00:00.000Z');
  assert.equal(updated?.slug, 'better-slug');
  assert.equal(posts.getBySlug('first-slug')?.id, created.id);
  assert.equal(posts.getBySlug('better-slug')?.bodyMarkdown, 'Hello again');
  assert.equal(
    database.prepare('SELECT COUNT(*) FROM post_revisions WHERE post_id = ?')
      .pluck().get(created.id),
    2,
  );
});

test('backs up and restores both the database and media', async (t) => {
  const root = temporaryDirectory(t);
  const liveRoot = path.join(root, 'live');
  const backupRoot = path.join(root, 'backup');
  const media = ensureMediaDirectories(path.join(liveRoot, 'media'));
  fs.writeFileSync(path.join(media.originals, 'sample.jpg'), 'original bytes');

  const liveDatabase = openContentDatabase(path.join(liveRoot, 'content.sqlite'));
  const posts = new PostRepository(liveDatabase);
  posts.create({
    id: '01BACKUPPOST00000000000000',
    slug: 'backed-up-post',
    bodyMarkdown: 'Durable',
    bodyHtml: '<p>Durable</p>',
  });

  await backupContent(liveDatabase, path.join(liveRoot, 'media'), backupRoot);
  liveDatabase.close();

  const restoredDatabase = openContentDatabase(path.join(backupRoot, 'content.sqlite'));
  t.after(() => restoredDatabase.close());
  assert.equal(new PostRepository(restoredDatabase).getBySlug('backed-up-post')?.bodyMarkdown, 'Durable');
  assert.equal(
    fs.readFileSync(path.join(backupRoot, 'media', 'originals', 'sample.jpg'), 'utf8'),
    'original bytes',
  );
});

test('stores original images, generates derivatives, and resolves safe public files', async (t) => {
  const root = temporaryDirectory(t);
  const database = openContentDatabase(path.join(root, 'content.sqlite'));
  t.after(() => database.close());
  const posts = new PostRepository(database);
  posts.create({
    id: 'media-post', slug: 'media-post', bodyMarkdown: 'Photo', bodyHtml: '<p>Photo</p>',
  });
  const repository = new MediaRepository(database);
  const service = new MediaService(repository, posts, path.join(root, 'media'));
  const original = await sharp({
    create: { width: 100, height: 50, channels: 3, background: '#336699' },
  }).png().toBuffer();

  const uploaded = await service.uploadImage({
    altText: 'A blue rectangle used for testing',
    buffer: original,
    displayOrder: 2,
    postId: 'media-post',
  });
  assert.equal(uploaded.mimeType, 'image/png');
  assert.equal(uploaded.width, 100);
  assert.equal(uploaded.height, 50);
  assert.equal(uploaded.displayOrder, 2);
  assert.equal('originalPath' in uploaded, false);
  assert.equal('derivatives' in uploaded, false);

  const originalFile = service.getFile(uploaded.id, 'original');
  const largeFile = service.getFile(uploaded.id, 'large');
  const thumbnailFile = service.getFile(uploaded.id, 'thumbnail');
  assert.ok(originalFile && largeFile && thumbnailFile);
  assert.deepEqual(fs.readFileSync(originalFile.path), original);
  assert.equal((await sharp(largeFile.path).metadata()).format, 'webp');
  assert.equal((await sharp(thumbnailFile.path).metadata()).width, 100);

  database.prepare("UPDATE media SET derived_json = '{\"large\":\"../../outside\"}' WHERE id = ?")
    .run(uploaded.id);
  assert.equal(service.getFile(uploaded.id, 'large'), null);
});

test('rejects invalid image uploads before creating media records', async (t) => {
  const root = temporaryDirectory(t);
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const posts = new PostRepository(database);
  posts.create({ id: 'post', slug: 'post', bodyMarkdown: 'Post', bodyHtml: '<p>Post</p>' });
  const service = new MediaService(new MediaRepository(database), posts, path.join(root, 'media'));

  await assert.rejects(() => service.uploadImage({
    altText: 'Not an image', buffer: Buffer.from('hello'), postId: 'post',
  }), /readable image/);
  await assert.rejects(() => service.uploadImage({
    altText: '', buffer: Buffer.from('hello'), postId: 'post',
  }), /altText/);
  assert.equal(database.prepare('SELECT COUNT(*) FROM media').pluck().get(), 0);
});
