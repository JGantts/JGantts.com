import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { MediaRepository } from '../media/media-repository';
import type { MediaRecord, MediaRendition, RenditionManifest } from '../media/types';
import type { PostRepository } from '../posts/post-repository';
import type { Post } from '../posts/types';
import { ensureMediaDirectories } from '../storage';
import {
  SOCIAL_PREVIEW_HEIGHT,
  SOCIAL_PREVIEW_MAX_IMAGES,
  SOCIAL_PREVIEW_WIDTH,
  socialPreviewLayout,
  type SocialPreviewTile,
} from './layout';
import { SocialPreviewRepository } from './social-preview-repository';
import type { SocialPreviewImage, SocialPreviewRecord, SocialPreviewStatus } from './types';

export const SOCIAL_PREVIEW_SCHEMA_VERSION = 1;
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const OUTPUT_RECIPE = {
  background: '#173f70',
  chromaSubsampling: '4:4:4',
  format: 'jpeg',
  gap: 12,
  quality: 90,
} as const;

interface SelectedImage {
  focalX: number;
  focalY: number;
  id: string;
  sourcePath: string;
}

export interface SocialPreviewFile {
  mimeType: 'image/jpeg';
  path: string;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function safeFocalPoint(value: number | null): number {
  return value === null || !Number.isFinite(value) ? 0.5 : clamp(value, 0, 1);
}

export function selectSocialPreviewMedia(post: Post, media: MediaRecord[]): MediaRecord[] {
  const ready = media.filter((item) => item.processingState === 'ready');
  const hero = ready.find((item) => item.id === post.heroMediaId) ?? ready[0];
  if (!hero) return [];
  return [hero, ...ready.filter((item) => item.id !== hero.id)]
    .slice(0, SOCIAL_PREVIEW_MAX_IMAGES);
}

function largestRendition(media: MediaRecord): MediaRendition | null {
  const manifest = media.renditionManifest as Partial<RenditionManifest>;
  const renditions = Array.isArray(manifest.renditions) ? manifest.renditions : [];
  return renditions
    .filter((item) => item.purpose === 'responsive')
    .sort((left, right) => (right.width * right.height) - (left.width * left.height))[0] ?? null;
}

function fingerprintFor(post: Post, media: MediaRecord[]): string {
  return createHash('sha256').update(JSON.stringify({
    schema: SOCIAL_PREVIEW_SCHEMA_VERSION,
    canvas: [SOCIAL_PREVIEW_WIDTH, SOCIAL_PREVIEW_HEIGHT],
    output: OUTPUT_RECIPE,
    heroMediaId: post.heroMediaId,
    media: media.map((item) => ({
      id: item.id,
      checksum: item.checksumSha256,
      dimensions: [item.width, item.height],
      rendition: largestRendition(item)?.path ?? item.originalPath,
      pipelineVersion: (item.renditionManifest as Partial<RenditionManifest>).pipelineVersion ?? null,
      focalX: safeFocalPoint(item.focalX),
      focalY: safeFocalPoint(item.focalY),
      order: item.displayOrder,
    })),
  })).digest('hex').slice(0, 32);
}

function absoluteMediaPath(mediaRoot: string, relativePath: string): string | null {
  const root = path.resolve(mediaRoot);
  const resolved = path.resolve(root, relativePath);
  return resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

function selectedImage(mediaRoot: string, media: MediaRecord): SelectedImage {
  const rendition = largestRendition(media);
  const sourcePath = absoluteMediaPath(mediaRoot, rendition?.path ?? media.originalPath);
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error(`Source image ${media.id} is missing or outside the media directory.`);
  }
  return {
    id: media.id,
    focalX: safeFocalPoint(media.focalX),
    focalY: safeFocalPoint(media.focalY),
    sourcePath,
  };
}

async function renderTile(image: SelectedImage, tile: SocialPreviewTile): Promise<Buffer> {
  const source = sharp(image.sourcePath).autoOrient();
  const metadata = await source.metadata();
  const width = metadata.autoOrient.width;
  const height = metadata.autoOrient.height;
  if (!width || !height) throw new Error(`Source image ${image.id} has no readable dimensions.`);
  const scale = Math.max(tile.width / width, tile.height / height);
  const resizedWidth = Math.max(tile.width, Math.round(width * scale));
  const resizedHeight = Math.max(tile.height, Math.round(height * scale));
  const left = Math.round(clamp(
    (image.focalX * resizedWidth) - (tile.width / 2),
    0,
    resizedWidth - tile.width,
  ));
  const top = Math.round(clamp(
    (image.focalY * resizedHeight) - (tile.height / 2),
    0,
    resizedHeight - tile.height,
  ));
  return source.resize({ width: resizedWidth, height: resizedHeight, fit: 'fill' })
    .extract({ left, top, width: tile.width, height: tile.height })
    .toColourspace('srgb')
    .flatten({ background: OUTPUT_RECIPE.background })
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

function imageFor(record: SocialPreviewRecord, post: Post): SocialPreviewImage {
  return {
    alt: post.title?.trim()
      ? `Photo collage for ${post.title.trim()}`
      : 'Photo collage for this post',
    height: record.height,
    mimeType: record.mimeType,
    url: `/media/social/${encodeURIComponent(record.postId)}/${record.fingerprint}.jpg`,
    width: record.width,
  };
}

export class SocialPreviewService {
  private readonly tasks = new Map<string, Promise<SocialPreviewStatus>>();
  private readonly directories;

  constructor(
    private readonly previews: SocialPreviewRepository,
    private readonly media: MediaRepository,
    private readonly posts: PostRepository,
    private readonly mediaRoot: string,
  ) {
    this.directories = ensureMediaDirectories(mediaRoot);
  }

  status(postId: string): SocialPreviewStatus {
    const post = this.posts.getById(postId);
    if (!post) return { image: null, schemaVersion: SOCIAL_PREVIEW_SCHEMA_VERSION, selectedMediaIds: [], state: 'none' };
    const selected = selectSocialPreviewMedia(post, this.media.listByPostId(postId));
    const selectedMediaIds = selected.map((item) => item.id);
    if (!selected.length) return { image: null, schemaVersion: SOCIAL_PREVIEW_SCHEMA_VERSION, selectedMediaIds, state: 'none' };
    const expected = fingerprintFor(post, selected);
    const record = this.previews.getForPost(postId);
    if (!record) return { image: null, schemaVersion: SOCIAL_PREVIEW_SCHEMA_VERSION, selectedMediaIds, state: 'missing' };
    const filePath = absoluteMediaPath(this.mediaRoot, record.relativePath);
    if (record.fingerprint !== expected || !filePath || !fs.existsSync(filePath)) {
      return { image: null, schemaVersion: SOCIAL_PREVIEW_SCHEMA_VERSION, selectedMediaIds, state: 'outdated' };
    }
    return { image: imageFor(record, post), schemaVersion: record.schemaVersion, selectedMediaIds, state: 'current' };
  }

  generate(postId: string): Promise<SocialPreviewStatus> {
    const active = this.tasks.get(postId);
    if (active) return active;
    const task = this.generateOne(postId).finally(() => {
      if (this.tasks.get(postId) === task) this.tasks.delete(postId);
    });
    this.tasks.set(postId, task);
    return task;
  }

  async generateAll(options: { concurrency?: number } = {}): Promise<Array<{
    error?: string;
    postId: string;
    state: SocialPreviewStatus['state'] | 'failed';
  }>> {
    const concurrency = options.concurrency ?? 2;
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
      throw new RangeError('concurrency must be an integer from 1 through 8.');
    }
    const posts = this.posts.listAll();
    const results = new Array<{ error?: string; postId: string; state: SocialPreviewStatus['state'] | 'failed' }>(posts.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < posts.length) {
        const index = cursor++;
        const postId = posts[index].id;
        try {
          results[index] = { postId, state: (await this.generate(postId)).state };
        } catch (error) {
          results[index] = {
            postId,
            state: 'failed',
            error: error instanceof Error ? error.message : 'Unknown generation failure.',
          };
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, posts.length) }, worker));
    return results;
  }

  getFile(postId: string, fingerprint: string): SocialPreviewFile | null {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(postId) || !/^[a-f0-9]{32}$/.test(fingerprint)) return null;
    const filePath = path.join(this.directories.social, postId, `${fingerprint}.jpg`);
    const socialRoot = `${path.resolve(this.directories.social)}${path.sep}`;
    if (!path.resolve(filePath).startsWith(socialRoot) || !fs.existsSync(filePath)) return null;
    return { mimeType: 'image/jpeg', path: filePath };
  }

  private async generateOne(postId: string): Promise<SocialPreviewStatus> {
    const post = this.posts.getById(postId);
    if (!post) throw Object.assign(new Error('Post not found.'), { status: 404 });
    const selected = selectSocialPreviewMedia(post, this.media.listByPostId(postId));
    if (!selected.length) return { image: null, schemaVersion: SOCIAL_PREVIEW_SCHEMA_VERSION, selectedMediaIds: [], state: 'none' };
    const fingerprint = fingerprintFor(post, selected);
    const existing = this.previews.getForPost(postId);
    const finalDirectory = path.join(this.directories.social, postId);
    const finalPath = path.join(finalDirectory, `${fingerprint}.jpg`);
    if (existing?.fingerprint === fingerprint && fs.existsSync(finalPath)) {
      return { image: imageFor(existing, post), schemaVersion: existing.schemaVersion, selectedMediaIds: selected.map((item) => item.id), state: 'current' };
    }

    fs.mkdirSync(finalDirectory, { recursive: true, mode: 0o750 });
    const stagingDirectory = fs.mkdtempSync(path.join(this.mediaRoot, `.staging-${process.pid}-social-`));
    const stagedPath = path.join(stagingDirectory, `${fingerprint}.jpg`);
    try {
      const images = selected.map((item) => selectedImage(this.mediaRoot, item));
      const layout = socialPreviewLayout(images.length);
      const tiles = await Promise.all(images.map((image, index) => renderTile(image, layout[index])));
      const info = await sharp({
        create: {
          width: SOCIAL_PREVIEW_WIDTH,
          height: SOCIAL_PREVIEW_HEIGHT,
          channels: 3,
          background: OUTPUT_RECIPE.background,
        },
      }).composite(tiles.map((input, index) => ({
        input,
        left: layout[index].x,
        top: layout[index].y,
      }))).jpeg({ quality: OUTPUT_RECIPE.quality, chromaSubsampling: OUTPUT_RECIPE.chromaSubsampling }).toFile(stagedPath);
      const verified = await sharp(stagedPath).metadata();
      if (verified.format !== 'jpeg' || verified.width !== SOCIAL_PREVIEW_WIDTH
        || verified.height !== SOCIAL_PREVIEW_HEIGHT) {
        throw new Error('Generated social preview failed verification.');
      }
      if (info.size < 1 || info.size > MAX_OUTPUT_BYTES) {
        throw new Error('Generated social preview is outside the allowed file-size range.');
      }
      if (verified.exif || verified.iptc || verified.xmp) {
        throw new Error('Generated social preview unexpectedly retained private metadata.');
      }
      if (!fs.existsSync(finalPath)) fs.renameSync(stagedPath, finalPath);
      fs.chmodSync(finalPath, 0o640);
      const now = new Date().toISOString();
      const record = this.previews.upsert({
        postId,
        fingerprint,
        relativePath: path.posix.join('social', postId, `${fingerprint}.jpg`),
        mimeType: 'image/jpeg',
        width: SOCIAL_PREVIEW_WIDTH,
        height: SOCIAL_PREVIEW_HEIGHT,
        byteSize: info.size,
        schemaVersion: SOCIAL_PREVIEW_SCHEMA_VERSION,
        selectedMediaIds: selected.map((item) => item.id),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      return { image: imageFor(record, post), schemaVersion: record.schemaVersion, selectedMediaIds: record.selectedMediaIds, state: 'current' };
    } finally {
      fs.rmSync(stagingDirectory, { recursive: true, force: true });
    }
  }
}
