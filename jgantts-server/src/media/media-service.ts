import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { PostRepository } from '../posts/post-repository';
import { PostInputError } from '../posts/errors';
import { ensureMediaDirectories } from '../storage';
import { MediaRepository } from './media-repository';
import type { MediaRecord, MediaVariant } from './types';

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const formats = {
  avif: { extension: 'avif', mimeType: 'image/avif' },
  jpeg: { extension: 'jpg', mimeType: 'image/jpeg' },
  png: { extension: 'png', mimeType: 'image/png' },
  webp: { extension: 'webp', mimeType: 'image/webp' },
} as const;

export interface UploadImageInput {
  altText: string;
  buffer: Buffer;
  displayOrder?: number;
  postId: string;
}

export interface PublicMedia extends Omit<MediaRecord, 'originalPath' | 'derivatives'> {
  urls: Record<'original' | 'large' | 'thumbnail', string>;
}

export interface MediaFile {
  mimeType: string;
  path: string;
}

function publicMedia(media: MediaRecord): PublicMedia {
  const base = `/media/${encodeURIComponent(media.id)}`;
  const { originalPath: _originalPath, derivatives: _derivatives, ...publicFields } = media;
  return {
    ...publicFields,
    urls: {
      original: `${base}/original`,
      large: `${base}/large`,
      thumbnail: `${base}/thumbnail`,
    },
  };
}

export class MediaService {
  private readonly directories;

  constructor(
    private readonly media: MediaRepository,
    private readonly posts: PostRepository,
    private readonly mediaRoot: string,
  ) {
    this.directories = ensureMediaDirectories(mediaRoot);
  }

  async uploadImage(input: UploadImageInput): Promise<PublicMedia> {
    if (!this.posts.getById(input.postId)) throw new PostInputError('postId does not identify a post.');
    if (!Buffer.isBuffer(input.buffer) || input.buffer.length === 0) {
      throw new PostInputError('An image file is required.');
    }
    if (input.buffer.length > MAX_IMAGE_BYTES) throw new PostInputError('Image exceeds the 25 MB limit.');
    if (
      typeof input.altText !== 'string'
      || input.altText.trim().length === 0
      || input.altText.length > 2_000
    ) {
      throw new PostInputError('altText must be a non-empty string no longer than 2,000 characters.');
    }
    const displayOrder = input.displayOrder ?? 0;
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      throw new PostInputError('displayOrder must be a non-negative integer.');
    }

    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(input.buffer).metadata();
    } catch {
      throw new PostInputError('The uploaded file is not a readable image.');
    }
    const format = metadata.format && formats[metadata.format as keyof typeof formats];
    if (!format || !metadata.width || !metadata.height) {
      throw new PostInputError('Only JPEG, PNG, WebP, and AVIF images are supported.');
    }

    const id = randomUUID();
    const originalName = `${id}.${format.extension}`;
    const largeName = `${id}-large.webp`;
    const thumbnailName = `${id}-thumbnail.webp`;
    const originalPath = path.join(this.directories.originals, originalName);
    const largePath = path.join(this.directories.derived, largeName);
    const thumbnailPath = path.join(this.directories.derived, thumbnailName);
    const createdPaths: string[] = [];

    try {
      fs.writeFileSync(originalPath, input.buffer, { flag: 'wx', mode: 0o640 });
      createdPaths.push(originalPath);
      await sharp(input.buffer).rotate().resize({ width: 1_600, withoutEnlargement: true })
        .webp({ quality: 84 }).toFile(largePath);
      createdPaths.push(largePath);
      await sharp(input.buffer).rotate().resize({ width: 480, withoutEnlargement: true })
        .webp({ quality: 78 }).toFile(thumbnailPath);
      createdPaths.push(thumbnailPath);

      return publicMedia(this.media.create({
        id,
        postId: input.postId,
        originalPath: path.posix.join('originals', originalName),
        derivatives: {
          large: path.posix.join('derived', largeName),
          thumbnail: path.posix.join('derived', thumbnailName),
        },
        mimeType: format.mimeType,
        width: metadata.width,
        height: metadata.height,
        byteSize: input.buffer.length,
        checksumSha256: createHash('sha256').update(input.buffer).digest('hex'),
        altText: input.altText,
        focalX: null,
        focalY: null,
        displayOrder,
        createdAt: new Date().toISOString(),
      }));
    } catch (error) {
      for (const createdPath of createdPaths) fs.rmSync(createdPath, { force: true });
      throw error;
    }
  }

  getFile(id: string, variant: MediaVariant): MediaFile | null {
    const media = this.media.getById(id);
    if (!media) return null;
    const relativePath = variant === 'original' ? media.originalPath : media.derivatives[variant];
    if (!relativePath) return null;
    const filePath = path.resolve(this.mediaRoot, relativePath);
    const rootPrefix = `${path.resolve(this.mediaRoot)}${path.sep}`;
    if (!filePath.startsWith(rootPrefix) || !fs.existsSync(filePath)) return null;
    return {
      path: filePath,
      mimeType: variant === 'original' ? media.mimeType : 'image/webp',
    };
  }

  listForPost(postId: string): PublicMedia[] {
    return this.media.listByPostId(postId).map(publicMedia);
  }
}
