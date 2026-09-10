import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';
import sharp from 'sharp';
import { backupContent } from '../src/db/backup';
import { inTransaction, openContentDatabase, openContentDatabaseReadOnly } from '../src/db/database';
import { migrations, migrateDatabase } from '../src/db/migrations';
import { assertSchemaCompatible, inspectDatabaseVersion } from '../src/cli/check-schema-compatibility';
import { MediaRepository } from '../src/media/media-repository';
import { MediaService, uploadSourceFormats } from '../src/media/media-service';
import { PostRepository } from '../src/posts/post-repository';
import { ensureMediaDirectories } from '../src/storage';

function temporaryDirectory(t: test.TestContext): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jgantts-content-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
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

test('inspects schema compatibility without migrating the database', (t) => {
  const root = temporaryDirectory(t);
  const databasePath = path.join(root, 'content.sqlite');
  assert.equal(inspectDatabaseVersion(databasePath), 0);

  const database = openContentDatabase(databasePath);
  database.close();
  const result = assertSchemaCompatible(databasePath);
  assert.equal(result.databaseVersion, migrations.at(-1)?.version);
  assert.equal(result.maximumDatabaseVersion, migrations.at(-1)?.version);

  const future = new Database(databasePath);
  future.prepare(
    'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
  ).run(999, 'future_incompatible_schema', new Date().toISOString());
  future.close();
  assert.throws(() => assertSchemaCompatible(databasePath), /outside supported range/);
});

test('opens backups read-only without applying pending migrations', (t) => {
  const root = temporaryDirectory(t);
  const databasePath = path.join(root, 'content.sqlite');
  const database = new Database(databasePath);
  database.exec('CREATE TABLE existing_content (id INTEGER PRIMARY KEY) STRICT;');
  database.close();

  const readOnly = openContentDatabaseReadOnly(databasePath);
  assert.equal(
    readOnly.prepare("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'").pluck().get(),
    0,
  );
  assert.throws(() => readOnly.exec('CREATE TABLE forbidden (id INTEGER)'), /readonly/i);
  readOnly.close();
  assert.throws(() => openContentDatabaseReadOnly(path.join(root, 'missing.sqlite')), /(?:not exist|unable to open)/i);
});

test('schema policy tracks migrations and requires expand-contract for future changes', () => {
  const policy = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, '../schema-compatibility.json'),
    'utf8',
  )) as {
    expandContractRequiredAfterVersion: number;
    maximumDatabaseVersion: number;
    releaseDatabaseVersion: number;
  };
  const latestVersion = migrations.at(-1)?.version;
  assert.equal(policy.releaseDatabaseVersion, latestVersion);
  assert.equal(policy.maximumDatabaseVersion, latestVersion);
  assert.equal(policy.expandContractRequiredAfterVersion, latestVersion);

  const destructiveSql = /\b(?:DROP\s+(?:TABLE|COLUMN|INDEX)|ALTER\s+TABLE\s+\S+\s+RENAME|DELETE\s+FROM)\b/i;
  for (const migration of migrations) {
    if (migration.version > policy.expandContractRequiredAfterVersion) {
      assert.doesNotMatch(migration.sql, destructiveSql, `${migration.name} needs a dedicated rollout plan`);
    }
  }
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
  oldDatabase.prepare(`
    INSERT INTO media (
      id, post_id, original_path, derived_json, mime_type, width, height,
      byte_size, checksum_sha256, alt_text, display_order, created_at
    ) VALUES ('old-media', 'old-post', 'originals/old.jpg', '{}', 'image/jpeg',
      1200, 800, 100, 'checksum', 'Historic photo', 0, ?)
  `).run('2026-09-04T12:00:00.000Z');
  oldDatabase.close();

  const upgraded = openContentDatabase(databasePath);
  t.after(() => upgraded.close());
  const post = new PostRepository(upgraded).getBySlug('old-post');
  const media = new MediaRepository(upgraded).getById('old-media');
  assert.equal(post?.title, null);
  assert.equal(media?.originalPath, 'originals/old.jpg');
  assert.equal(media?.altText, 'Historic photo');
  assert.equal(media?.checksumSha256, 'checksum');
  assert.equal(media?.displayOrder, 0);
  assert.equal(media?.caption, null);
  assert.equal(media?.processingState, 'ready');
  assert.equal(media?.processingError, null);
  assert.deepEqual(media?.renditionManifest, {});
  assert.equal(media?.updatedAt, media?.createdAt);
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
  posts.update(created.id, { status: 'published' }, '2026-09-04T14:00:00.000Z');
  const publishedHistory = posts.listPublishedRevisions(created.id);
  assert.equal(publishedHistory.length, 1);
  assert.deepEqual(publishedHistory[0]?.media, []);
  posts.update(created.id, { bodyMarkdown: 'Published again' }, '2026-09-04T15:00:00.000Z');
  assert.deepEqual(posts.listPublishedRevisions(created.id).map((item) => item.revision), [4, 3]);
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
  assert.equal(uploaded.caption, null);
  assert.equal(uploaded.processingState, 'ready');
  assert.equal(uploaded.updatedAt, uploaded.createdAt);
  assert.deepEqual(uploaded.renditions.map((rendition) => [rendition.format, rendition.width]), [
    ['webp', 100], ['jpeg', 100],
  ]);
  assert.deepEqual(
    uploaded.placeholder && [uploaded.placeholder.format, uploaded.placeholder.width, uploaded.placeholder.height],
    ['webp', 32, 16],
  );
  assert.equal(uploaded.placeholder?.url, `/media/${uploaded.id}/placeholder`);
  assert.equal(uploaded.renditions[0]?.url, `/media/${uploaded.id}/w-100`);
  assert.equal(posts.update('media-post', { heroMediaId: uploaded.id })?.heroMediaId, uploaded.id);
  posts.create({
    id: 'different-post', slug: 'different-post', bodyMarkdown: 'Other', bodyHtml: '<p>Other</p>',
  });
  assert.throws(
    () => posts.update('different-post', { heroMediaId: uploaded.id }),
    /hero media must belong to the same post/,
  );
  const second = await service.uploadImage({
    altText: 'Second photo', buffer: original, displayOrder: 0, postId: 'media-post',
  });
  posts.update('media-post', { status: 'published' });
  const edited = service.updateMetadata(uploaded.id, {
    altText: 'Updated description', caption: 'Visible caption', focalX: 0.25, focalY: 0.75,
  });
  assert.equal(edited?.altText, 'Updated description');
  assert.equal(edited?.caption, 'Visible caption');
  assert.equal(edited?.focalX, 0.25);
  assert.match(edited?.urls.large ?? '', /\?rev=4$/);
  const publishedHistory = posts.listPublishedRevisions('media-post');
  assert.ok(publishedHistory.length >= 2);
  assert.equal((publishedHistory[0]?.media.find((item) => (item as { id: string }).id === uploaded.id) as { altText?: string })?.altText, 'Updated description');
  assert.throws(
    () => service.updateMetadata(uploaded.id, { focalX: 2, focalY: 0.5 }),
    /focalX and focalY/,
  );
  const reordered = service.reorder('media-post', [uploaded.id, second.id]);
  assert.deepEqual(reordered.map((item) => [item.id, item.displayOrder]), [
    [uploaded.id, 0], [second.id, 1],
  ]);
  assert.equal(service.selectHero('media-post', second.id), second.id);
  assert.throws(() => service.selectHero('different-post', second.id), /must belong/);
  assert.equal(service.selectHero('media-post', null), null);
  assert.equal('originalPath' in uploaded, false);
  assert.equal('derivatives' in uploaded, false);

  const originalFile = service.getFile(uploaded.id, 'original');
  const largeFile = service.getFile(uploaded.id, 'large');
  const thumbnailFile = service.getFile(uploaded.id, 'thumbnail');
  assert.ok(originalFile && largeFile && thumbnailFile);
  assert.deepEqual(fs.readFileSync(originalFile.path), original);
  assert.equal((await sharp(largeFile.path).metadata()).format, 'webp');
  assert.equal((await sharp(thumbnailFile.path).metadata()).width, 100);
  const placeholderFile = service.getFile(uploaded.id, 'placeholder');
  assert.ok(placeholderFile);
  assert.equal(placeholderFile.mimeType, 'image/webp');
  assert.equal((await sharp(placeholderFile.path).metadata()).width, 32);

  database.prepare("UPDATE media SET derived_json = '{\"large\":\"../../outside\"}' WHERE id = ?")
    .run(uploaded.id);
  assert.equal(service.getFile(uploaded.id, 'large'), null);
});

test('generates responsive modern and fallback formats without upscaling', async (t) => {
  const root = temporaryDirectory(t);
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const posts = new PostRepository(database);
  posts.create({ id: 'responsive', slug: 'responsive', bodyMarkdown: '', bodyHtml: '' });
  const repository = new MediaRepository(database);
  const service = new MediaService(repository, posts, path.join(root, 'media'));
  const source = await sharp({
    create: { width: 3_000, height: 1_500, channels: 3, background: '#123456' },
  }).jpeg().toBuffer();

  const uploaded = await service.uploadImage({ postId: 'responsive', altText: 'Wide image', buffer: source });
  assert.deepEqual(
    uploaded.renditions.filter(({ format }) => format === 'webp').map(({ width, height }) => [width, height]),
    [[320, 160], [480, 240], [768, 384], [1_024, 512], [1_600, 800], [2_400, 1_200]],
  );
  assert.ok(uploaded.renditions.every((rendition) => rendition.byteSize > 0));
  assert.deepEqual(
    uploaded.renditions.filter(({ format }) => format === 'avif').map(({ width }) => width),
    [768, 1_024, 1_600, 2_400],
  );
  assert.deepEqual(
    uploaded.renditions.filter(({ format }) => format === 'jpeg').map(({ width }) => width),
    [320, 480, 768, 1_024, 1_600, 2_400],
  );
  for (const rendition of uploaded.renditions) {
    const file = service.getFile(uploaded.id, rendition.variant);
    assert.ok(file);
    assert.equal(file.mimeType, `image/${rendition.format}`);
    assert.equal((await sharp(file.path).metadata()).width, rendition.width);
  }
  const stored = repository.getById(uploaded.id)!;
  assert.deepEqual(
    'renditions' in stored.renditionManifest
      ? stored.renditionManifest.renditions.filter(({ format, purpose }) =>
        format === 'webp' && purpose === 'responsive')
        .map((rendition) => rendition.width)
      : [],
    [320, 480, 768, 1_024, 1_600, 2_400],
  );
  assert.equal(service.getFile(uploaded.id, 'w-9999'), null);
});

test('uses PNG rather than JPEG as the compatible fallback for transparency', async (t) => {
  const root = temporaryDirectory(t);
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const posts = new PostRepository(database);
  posts.create({ id: 'alpha', slug: 'alpha', bodyMarkdown: '', bodyHtml: '' });
  const service = new MediaService(new MediaRepository(database), posts, path.join(root, 'media'));
  const source = await sharp({
    create: { width: 400, height: 200, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } },
  }).png().toBuffer();

  const uploaded = await service.uploadImage({ postId: 'alpha', altText: 'Transparent image', buffer: source });
  assert.deepEqual(
    uploaded.renditions.map(({ format, width }) => [format, width]),
    [['webp', 320], ['png', 320], ['webp', 400], ['png', 400]],
  );
  assert.ok(uploaded.renditions.every(({ format }) => format !== 'jpeg'));
});

test('does not promote embedded photo metadata and strips it from every rendition', async (t) => {
  const root = temporaryDirectory(t);
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const posts = new PostRepository(database);
  posts.create({ id: 'profiled', slug: 'profiled', bodyMarkdown: '', bodyHtml: '' });
  const service = new MediaService(new MediaRepository(database), posts, path.join(root, 'media'));
  const privateMarker = 'private-location-marker';
  const captureTime = '2026-09-06T14:35:00-04:00';
  const source = await sharp({
    create: { width: 800, height: 400, channels: 3, background: { r: 210, g: 70, b: 40 } },
  })
    .withIccProfile('p3')
    .withExif({ IFD0: { Artist: privateMarker, DateTime: '2026:09:06 14:35:00' } })
    .withXmp(`<x:xmpmeta xmlns:x="adobe:ns:meta/" xmlns:exif="http://ns.adobe.com/exif/1.0/" xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"><exif:GPSLatitude>40.7128</exif:GPSLatitude><exif:GPSLongitude>-74.0060</exif:GPSLongitude><photoshop:DateCreated>${captureTime}</photoshop:DateCreated><private>${privateMarker}</private></x:xmpmeta>`)
    .jpeg()
    .toBuffer();
  const sourceMetadata = await sharp(source).metadata();
  assert.ok(sourceMetadata.icc);
  assert.ok(sourceMetadata.exif);
  assert.ok(sourceMetadata.xmp);

  const uploaded = await service.uploadImage({ postId: 'profiled', altText: 'Profiled image', buffer: source });
  assert.equal(uploaded.location, null);
  assert.equal(uploaded.date, null);
  assert.equal(uploaded.time, null);
  const parentPost = posts.getById('profiled')!;
  assert.equal(parentPost.location, null);
  assert.equal(parentPost.date, null);
  assert.equal(parentPost.time, null);
  assert.ok(uploaded.renditions.some(({ format }) => format === 'avif'));
  assert.ok(uploaded.placeholder);
  for (const rendition of [...uploaded.renditions, uploaded.placeholder]) {
    assert.equal(rendition.colorSpace, 'srgb');
    assert.equal(rendition.privateMetadataStripped, true);
    const file = service.getFile(uploaded.id, rendition.variant)!;
    const output = fs.readFileSync(file.path);
    const outputMetadata = await sharp(output).metadata();
    assert.equal(outputMetadata.space, 'srgb');
    assert.equal(outputMetadata.icc, undefined);
    assert.equal(outputMetadata.exif, undefined);
    assert.equal(outputMetadata.iptc, undefined);
    assert.equal(outputMetadata.xmp, undefined);
    assert.equal(output.includes(Buffer.from(privateMarker)), false);
  }
  // Archival source bytes remain immutable and private-policy migration is still
  // deferred; only public renditions are normalized and scrubbed here.
  assert.deepEqual(fs.readFileSync(service.getFile(uploaded.id, 'original')!.path), source);
});

test('tiny placeholders fit within 32 pixels and do not upscale small images', async (t) => {
  const root = temporaryDirectory(t);
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const posts = new PostRepository(database);
  posts.create({ id: 'placeholder', slug: 'placeholder', bodyMarkdown: '', bodyHtml: '' });
  const service = new MediaService(new MediaRepository(database), posts, path.join(root, 'media'));
  const portraitSource = await sharp({
    create: { width: 20, height: 40, channels: 3, background: '#778899' },
  }).png().toBuffer();

  const uploaded = await service.uploadImage({
    postId: 'placeholder', altText: 'Tiny portrait', buffer: portraitSource,
  });
  assert.deepEqual(
    uploaded.placeholder && [uploaded.placeholder.width, uploaded.placeholder.height],
    [16, 32],
  );
  assert.ok(uploaded.placeholder && uploaded.placeholder.byteSize > 0);
  assert.ok(uploaded.renditions.every(({ purpose }) => purpose === 'responsive'));
  const alreadySmall = await sharp({
    create: { width: 20, height: 10, channels: 3, background: '#778899' },
  }).png().toBuffer();
  const smallUpload = await service.uploadImage({
    postId: 'placeholder', altText: 'Already small', buffer: alreadySmall,
  });
  assert.deepEqual(
    smallUpload.placeholder && [smallUpload.placeholder.width, smallUpload.placeholder.height],
    [20, 10],
  );
});

test('staged upload failures remove partial files without touching valid media', async (t) => {
  const root = temporaryDirectory(t);
  const mediaRoot = path.join(root, 'media');
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const posts = new PostRepository(database);
  const repository = new MediaRepository(database);
  posts.create({ id: 'atomic', slug: 'atomic', bodyMarkdown: '', bodyHtml: '' });
  const source = await sharp({
    create: { width: 100, height: 50, channels: 3, background: '#445566' },
  }).png().toBuffer();
  const service = new MediaService(repository, posts, mediaRoot);
  const existing = await service.uploadImage({ postId: 'atomic', altText: 'Existing', buffer: source });
  const snapshot = () => fs.readdirSync(mediaRoot, { recursive: true }).map(String).sort();
  const validFiles = snapshot();

  const corruptingService = new MediaService(repository, posts, mediaRoot, {
    afterStage(files) {
      const stagingDirectory = path.dirname(files[0].stagedPath);
      assert.equal(fs.statSync(stagingDirectory).mode & 0o777, 0o700);
      fs.writeFileSync(files.find(({ rendition }) => rendition)?.stagedPath ?? '', 'corrupt');
    },
  });
  await assert.rejects(
    () => corruptingService.uploadImage({ postId: 'atomic', altText: 'Corrupt', buffer: source }),
    /verification failed|unsupported image format/,
  );
  assert.deepEqual(snapshot(), validFiles);

  const diskFullService = new MediaService(repository, posts, mediaRoot, {
    afterStage() {
      throw Object.assign(new Error('simulated disk full'), { code: 'ENOSPC' });
    },
  });
  await assert.rejects(
    () => diskFullService.uploadImage({ postId: 'atomic', altText: 'Disk full', buffer: source }),
    /simulated disk full/,
  );
  assert.deepEqual(snapshot(), validFiles);

  const promotionFailureService = new MediaService(repository, posts, mediaRoot, {
    beforePromote(_file, index) {
      if (index === 2) throw new Error('injected promotion failure');
    },
  });
  await assert.rejects(
    () => promotionFailureService.uploadImage({ postId: 'atomic', altText: 'Promotion', buffer: source }),
    /injected promotion failure/,
  );
  assert.deepEqual(snapshot(), validFiles);

  database.exec(`CREATE TRIGGER reject_staged_media BEFORE INSERT ON media
    BEGIN SELECT RAISE(ABORT, 'injected media database failure'); END;`);
  await assert.rejects(
    () => service.uploadImage({ postId: 'atomic', altText: 'Database', buffer: source }),
    /injected media database failure/,
  );
  database.exec('DROP TRIGGER reject_staged_media');
  assert.deepEqual(snapshot(), validFiles);
  assert.equal(repository.listByPostId('atomic').length, 1);
  assert.ok(service.getFile(existing.id, 'original'));
});

test('dry-runs and regenerates versioned derivatives while reconciling oriented dimensions', async (t) => {
  const root = temporaryDirectory(t);
  const mediaRoot = path.join(root, 'media');
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const posts = new PostRepository(database);
  const repository = new MediaRepository(database);
  posts.create({ id: 'regenerate', slug: 'regenerate', bodyMarkdown: '', bodyHtml: '' });
  const service = new MediaService(repository, posts, mediaRoot);
  const source = await sharp({
    create: { width: 80, height: 40, channels: 3, background: '#334455' },
  }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const uploaded = await service.uploadImage({ postId: 'regenerate', altText: 'Rotated', buffer: source });
  const before = repository.getById(uploaded.id)!;
  const oldFiles = Array.from(new Set(Object.values(before.derivatives)))
    .map((relativePath) => path.join(mediaRoot, relativePath!));
  database.prepare("UPDATE media SET width = 999, height = 999, rendition_json = '{}' WHERE id = ?")
    .run(uploaded.id);

  const dryRun = await service.regenerateAll({ concurrency: 1, dryRun: true });
  assert.deepEqual(dryRun.map(({ id, status }) => [id, status]), [[uploaded.id, 'planned']]);
  assert.deepEqual([repository.getById(uploaded.id)!.width, repository.getById(uploaded.id)!.height], [999, 999]);
  assert.ok(oldFiles.every((file) => fs.existsSync(file)));

  const results = await service.regenerateAll({ concurrency: 2 });
  assert.deepEqual(results.map(({ id, status }) => [id, status]), [[uploaded.id, 'regenerated']]);
  const regenerated = repository.getById(uploaded.id)!;
  assert.deepEqual([regenerated.width, regenerated.height], [40, 80]);
  assert.ok('renditions' in regenerated.renditionManifest);
  if ('renditions' in regenerated.renditionManifest) {
    assert.ok(regenerated.renditionManifest.renditions.every(({ variant }) => /-v-[a-f0-9]{8}$/.test(variant)));
  }
  assert.ok(oldFiles.every((file) => !fs.existsSync(file)));
  assert.deepEqual(fs.readFileSync(service.getFile(uploaded.id, 'original')!.path), source);
  assert.match(service.listForPost('regenerate')[0].renditions[0].url, /-v-[a-f0-9]{8}$/);
  await assert.rejects(() => service.regenerateAll({ concurrency: 0 }), /concurrency/);

  const currentPaths = { ...regenerated.derivatives };
  const failingService = new MediaService(repository, posts, mediaRoot, {
    afterStage(files) {
      fs.writeFileSync(files.find(({ rendition }) => rendition)?.stagedPath ?? '', 'corrupt');
    },
  });
  const failed = await failingService.regenerateAll();
  assert.equal(failed[0].status, 'failed');
  assert.deepEqual(repository.getById(uploaded.id)!.derivatives, currentPaths);
  assert.ok(Object.values(currentPaths).every((relativePath) =>
    relativePath && fs.existsSync(path.join(mediaRoot, relativePath))));
});

test('rejects decompression-bomb dimensions and removes staging left by a dead process', async (t) => {
  const root = temporaryDirectory(t);
  const mediaRoot = path.join(root, 'media');
  ensureMediaDirectories(mediaRoot);
  const staleDirectory = path.join(mediaRoot, '.staging-999999-crash');
  fs.mkdirSync(staleDirectory, { mode: 0o700 });
  fs.writeFileSync(path.join(staleDirectory, 'partial'), 'partial');
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const posts = new PostRepository(database);
  posts.create({ id: 'limits', slug: 'limits', bodyMarkdown: '', bodyHtml: '' });
  const service = new MediaService(new MediaRepository(database), posts, mediaRoot);
  assert.equal(fs.existsSync(staleDirectory), false);

  const tinyPng = await sharp({
    create: { width: 1, height: 1, channels: 3, background: 'black' },
  }).png().toBuffer();
  const oversizedHeader = Buffer.from(tinyPng);
  oversizedHeader.writeUInt32BE(10_000, 16);
  oversizedHeader.writeUInt32BE(9_000, 20);
  oversizedHeader.writeUInt32BE(crc32(oversizedHeader.subarray(12, 29)), 29);
  await assert.rejects(
    () => service.uploadImage({ postId: 'limits', altText: 'Oversized', buffer: oversizedHeader }),
    /80 megapixel safety limit/,
  );
  assert.deepEqual(fs.readdirSync(path.join(mediaRoot, 'derived')), []);
  assert.deepEqual(fs.readdirSync(path.join(mediaRoot, 'originals')), []);
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
  }), /readable image/);
  assert.equal(database.prepare('SELECT COUNT(*) FROM media').pluck().get(), 0);
});

test('recognizes HEIF as an HEIC upload source while keeping browser renditions separate', () => {
  assert.deepEqual(uploadSourceFormats.heif, { extension: 'heic', mimeType: 'image/heic' });
  assert.equal('heif' in uploadSourceFormats, true);
});

test('media deletion protects published photos, clears heroes, and compacts order', async (t) => {
  const root = temporaryDirectory(t);
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const posts = new PostRepository(database);
  const repository = new MediaRepository(database);
  const service = new MediaService(repository, posts, root);
  posts.create({ id: 'delete-post', slug: 'delete-post', bodyMarkdown: '', bodyHtml: '' });
  const buffer = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'red' } })
    .png().toBuffer();
  const first = await service.uploadImage({ postId: 'delete-post', altText: 'First', buffer });
  const second = await service.uploadImage({ postId: 'delete-post', altText: 'Second', buffer, displayOrder: 5 });
  const files = ['original', 'large', 'thumbnail'].map((variant) =>
    service.getFile(first.id, variant as 'original' | 'large' | 'thumbnail')!.path);
  posts.update('delete-post', { status: 'published', heroMediaId: first.id });
  assert.throws(() => service.deleteImage(first.id), /Unpublish/);
  assert.ok(repository.getById(first.id));
  assert.ok(files.every((file) => fs.existsSync(file)));
  assert.equal(repository.pendingDeletionPaths(first.id), null);
  posts.update('delete-post', { status: 'draft' });
  // Database failure must roll back the journal, hero change, and media removal.
  database.exec(`CREATE TRIGGER reject_media_delete BEFORE DELETE ON media
    BEGIN SELECT RAISE(ABORT, 'injected deletion failure'); END;`);
  assert.throws(() => service.deleteImage(first.id), /injected deletion failure/);
  assert.equal(posts.getById('delete-post')!.heroMediaId, first.id);
  assert.equal(repository.pendingDeletionPaths(first.id), null);
  assert.ok(files.every((file) => fs.existsSync(file)));
  database.exec('DROP TRIGGER reject_media_delete');
  service.deleteImage(first.id);
  assert.equal(repository.getById(first.id), null);
  assert.equal(posts.getById('delete-post')!.heroMediaId, null);
  assert.deepEqual(service.listForPost('delete-post').map((item) => [item.id, item.displayOrder]), [[second.id, 0]]);
  assert.ok(files.every((file) => !fs.existsSync(file)));
  service.deleteImage(first.id);
  service.deleteImage(second.id);
  service.deleteImage('unknown');
  assert.deepEqual(service.listForPost('delete-post'), []);
});

test('failed media cleanup survives database restart and retries missing files safely', async (t) => {
  const root = temporaryDirectory(t);
  const databasePath = path.join(root, 'content.sqlite');
  let database = openContentDatabase(databasePath);
  t.after(() => database.close());
  let posts = new PostRepository(database);
  let repository = new MediaRepository(database);
  let service = new MediaService(repository, posts, root);
  posts.create({ id: 'retry-post', slug: 'retry-post', bodyMarkdown: '', bodyHtml: '' });
  const buffer = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'blue' } })
    .png().toBuffer();
  const photo = await service.uploadImage({ postId: 'retry-post', altText: 'Blue', buffer });
  const original = service.getFile(photo.id, 'original')!.path;
  const large = service.getFile(photo.id, 'large')!.path;
  fs.unlinkSync(large);
  fs.mkdirSync(large); // A filesystem failure after the original has already been removed.
  assert.throws(() => service.deleteImage(photo.id), /cleanup is pending/);
  assert.equal(fs.existsSync(original), false);
  assert.equal(service.getFile(photo.id, 'thumbnail'), null);
  assert.ok(repository.pendingDeletionPaths(photo.id));
  database.close();
  database = openContentDatabase(databasePath);
  posts = new PostRepository(database);
  repository = new MediaRepository(database);
  service = new MediaService(repository, posts, root);
  fs.rmdirSync(large);
  service.deleteImage(photo.id);
  assert.equal(repository.pendingDeletionPaths(photo.id), null);
  assert.deepEqual(fs.readdirSync(path.join(root, 'derived')), []);
  service.deleteImage(photo.id);
});

test('records oriented source dimensions and preserves orientation in both renditions', async (t) => {
  const root = temporaryDirectory(t);
  const database = openContentDatabase(':memory:');
  t.after(() => database.close());
  const posts = new PostRepository(database);
  posts.create({ id: 'orientation', slug: 'orientation', bodyMarkdown: '', bodyHtml: '' });
  const repository = new MediaRepository(database);
  const service = new MediaService(repository, posts, path.join(root, 'media'));
  // Four distinct quadrants verify mirrored orientations as well as 90-degree turns.
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
  const expectedCorners = [
    [0, 1, 2, 3], [1, 0, 3, 2], [3, 2, 1, 0], [2, 3, 0, 1],
    [0, 2, 1, 3], [2, 0, 3, 1], [3, 1, 2, 0], [1, 3, 0, 2],
  ];
  for (const orientation of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const tiles = await Promise.all(colors.map((background) => sharp({
      create: { width: 40, height: 20, channels: 3, background },
    }).png().toBuffer()));
    const source = await sharp({ create: { width: 80, height: 40, channels: 3, background: 'white' } })
      .composite(tiles.map((input, i) => ({ input, left: (i % 2) * 40, top: Math.floor(i / 2) * 20 })))
      .withMetadata({ orientation }).jpeg({ quality: 100 }).toBuffer();
    const uploaded = await service.uploadImage({ postId: 'orientation', altText: 'Four colored quadrants', buffer: source });
    const expectedSize = orientation >= 5 ? [40, 80] : [80, 40];
    assert.deepEqual([uploaded.width, uploaded.height], expectedSize);
    const stored = repository.getById(uploaded.id)!;
    assert.deepEqual([stored.width, stored.height], expectedSize);
    assert.deepEqual(fs.readFileSync(service.getFile(uploaded.id, 'original')!.path), source);
    for (const variant of ['large', 'thumbnail'] as const) {
      const file = service.getFile(uploaded.id, variant)!;
      const metadata = await sharp(file.path).metadata();
      assert.deepEqual([metadata.width, metadata.height], expectedSize);
      assert.equal(metadata.orientation, undefined);
      const { data, info } = await sharp(file.path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const positions = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]];
      const actual = positions.map(([x, y]) => {
        const offset = (Math.floor(y * info.height) * info.width + Math.floor(x * info.width)) * info.channels;
        const [r, g, b] = data.subarray(offset, offset + 3);
        return b > 150 ? 2 : r > 150 ? (g > 150 ? 3 : 0) : 1;
      });
      assert.deepEqual(actual, expectedCorners[orientation - 1], `orientation ${orientation}, ${variant}`);
    }
  }
  for (const [width, height] of [[30, 60], [60, 30], [40, 40], [2400, 1200]]) {
    const source = await sharp({ create: { width, height, channels: 3, background: 'red' } }).png().toBuffer();
    const uploaded = await service.uploadImage({ postId: 'orientation', altText: 'Red image', buffer: source });
    assert.deepEqual([uploaded.width, uploaded.height], [width, height]);
    for (const [variant, maxWidth] of [['large', 1600], ['thumbnail', 480]] as const) {
      const metadata = await sharp(service.getFile(uploaded.id, variant)!.path).metadata();
      const scaledWidth = Math.min(width, maxWidth);
      assert.deepEqual([metadata.width, metadata.height], [scaledWidth, height * scaledWidth / width]);
    }
  }
});
