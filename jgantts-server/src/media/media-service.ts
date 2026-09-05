import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { PostRepository } from '../posts/post-repository';
import { PostInputError } from '../posts/errors';
import { ensureMediaDirectories } from '../storage';
import { MediaRepository } from './media-repository';
import type {
  MediaRecord, MediaRendition, MediaVariant, RenditionFormat, RenditionManifest,
} from './types';

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
// Covers compact masonry cells through a high-density expanded viewer. The
// oriented source width is added when it falls between these stops, and widths
// above the source are omitted.
export const RESPONSIVE_IMAGE_WIDTHS = [320, 480, 768, 1_024, 1_600, 2_400] as const;
const MINIMUM_AVIF_WIDTH = 768;
const renditionFormats: Record<RenditionFormat, { extension: string; mimeType: string }> = {
  avif: { extension: 'avif', mimeType: 'image/avif' },
  jpeg: { extension: 'jpg', mimeType: 'image/jpeg' },
  png: { extension: 'png', mimeType: 'image/png' },
  webp: { extension: 'webp', mimeType: 'image/webp' },
};
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

export interface PublicMedia extends Omit<
  MediaRecord,
  'originalPath' | 'derivatives' | 'processingError' | 'renditionManifest'
> {
  renditions: Array<Omit<MediaRendition, 'path'> & { url: string }>;
  urls: Record<'original' | 'large' | 'thumbnail', string>;
}

export interface MediaFile {
  mimeType: string;
  path: string;
}

export interface UpdateMediaMetadataInput {
  altText?: unknown;
  caption?: unknown;
  focalX?: unknown;
  focalY?: unknown;
}

function publicMedia(media: MediaRecord): PublicMedia {
  const base = `/media/${encodeURIComponent(media.id)}`;
  const manifest = media.renditionManifest as Partial<RenditionManifest>;
  const renditions = Array.isArray(manifest.renditions)
    ? manifest.renditions.map(({ path: _path, ...rendition }) => ({
      ...rendition,
      url: `${base}/${encodeURIComponent(rendition.variant)}`,
    }))
    : [];
  // Explicit fields keep future storage and processing details private by default.
  return {
    id: media.id,
    postId: media.postId,
    mimeType: media.mimeType,
    width: media.width,
    height: media.height,
    byteSize: media.byteSize,
    checksumSha256: media.checksumSha256,
    altText: media.altText,
    caption: media.caption,
    focalX: media.focalX,
    focalY: media.focalY,
    displayOrder: media.displayOrder,
    processingState: media.processingState,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
    renditions,
    urls: {
      original: `${base}/original`,
      large: `${base}/large`,
      thumbnail: `${base}/thumbnail`,
    },
  };
}

function variantFor(format: RenditionFormat, width: number): string {
  // Keep the width-only WebP URL introduced with the responsive pipeline stable.
  return format === 'webp' ? `w-${width}` : `${format}-w-${width}`;
}

async function writeRendition(
  buffer: Buffer,
  format: RenditionFormat,
  width: number,
  outputPath: string,
): Promise<sharp.OutputInfo> {
  const image = sharp(buffer).autoOrient().resize({ width, withoutEnlargement: true });
  if (format === 'avif') return image.avif({ quality: 58, effort: 4 }).toFile(outputPath);
  if (format === 'jpeg') return image.jpeg({ quality: width <= 480 ? 80 : 86 }).toFile(outputPath);
  if (format === 'png') return image.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(outputPath);
  return image.webp({ quality: width <= 480 ? 78 : 84 }).toFile(outputPath);
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
    const originalPath = path.join(this.directories.originals, originalName);
    const createdPaths: string[] = [];

    try {
      fs.writeFileSync(originalPath, input.buffer, { flag: 'wx', mode: 0o640 });
      createdPaths.push(originalPath);
      const sourceWidth = metadata.autoOrient.width;
      const responsiveWidths = Array.from(new Set([
        ...RESPONSIVE_IMAGE_WIDTHS.filter((width) => width <= sourceWidth),
        ...(sourceWidth < RESPONSIVE_IMAGE_WIDTHS.at(-1)! ? [sourceWidth] : []),
      ])).sort((left, right) => left - right);
      const renditions: MediaRendition[] = [];
      const derivatives: Record<string, string> = {};
      for (const width of responsiveWidths) {
        const outputFormats: RenditionFormat[] = [
          'webp',
          ...(width >= MINIMUM_AVIF_WIDTH ? ['avif' as const] : []),
          metadata.hasAlpha ? 'png' : 'jpeg',
        ];
        for (const outputFormat of outputFormats) {
          const variant = variantFor(outputFormat, width);
          const name = `${id}-${variant}.${renditionFormats[outputFormat].extension}`;
          const outputPath = path.join(this.directories.derived, name);
          const info = await writeRendition(input.buffer, outputFormat, width, outputPath);
          createdPaths.push(outputPath);
          const relativePath = path.posix.join('derived', name);
          derivatives[variant] = relativePath;
          renditions.push({
            byteSize: info.size,
            format: outputFormat,
            height: info.height,
            path: relativePath,
            variant,
            width: info.width,
          });
        }
      }
      const webpRenditions = renditions.filter((rendition) => rendition.format === 'webp');
      const closestPath = (target: number) => webpRenditions.reduce((closest, rendition) =>
        Math.abs(rendition.width - target) < Math.abs(closest.width - target) ? rendition : closest).path;
      derivatives.thumbnail = closestPath(480);
      derivatives.large = closestPath(1_600);

      const createdAt = new Date().toISOString();
      return publicMedia(this.media.create({
        id,
        postId: input.postId,
        originalPath: path.posix.join('originals', originalName),
        derivatives,
        mimeType: format.mimeType,
        // Source bytes stay immutable; layout dimensions describe the oriented
        // full-resolution composition, before derivative resizing.
        width: metadata.autoOrient.width,
        height: metadata.autoOrient.height,
        byteSize: input.buffer.length,
        checksumSha256: createHash('sha256').update(input.buffer).digest('hex'),
        altText: input.altText,
        caption: null,
        focalX: null,
        focalY: null,
        // Resolve append order after asynchronous processing so simultaneous uploads
        // cannot reserve the same position.
        displayOrder: input.displayOrder ?? this.media.listByPostId(input.postId)
          .reduce((next, item) => Math.max(next, item.displayOrder + 1), 0),
        processingState: 'ready',
        processingError: null,
        renditionManifest: { version: 1, renditions },
        createdAt,
        updatedAt: createdAt,
      }));
    } catch (error) {
      for (const createdPath of createdPaths) fs.rmSync(createdPath, { force: true });
      throw error;
    }
  }

  async uploadBatch(postId: unknown, files: Array<{ buffer: Buffer; altText: unknown }>) {
    if (typeof postId !== 'string' || !this.posts.getById(postId)) {
      throw new PostInputError('postId does not identify a post.');
    }
    if (files.length < 1 || files.length > 10
      || files.reduce((sum, file) => sum + file.buffer.length, 0) > 50 * 1024 * 1024) {
      throw new PostInputError('Batch must contain 1–10 files totaling at most 50 MiB.');
    }
    const results = [];
    for (const [index, file] of files.entries()) {
      try {
        const media = await this.uploadImage({ postId, buffer: file.buffer, altText: file.altText as string });
        results.push({ index, status: 'uploaded' as const, media });
      } catch (error) {
        results.push({ index, status: 'failed' as const, error: {
          code: error instanceof PostInputError ? 'bad_request' : 'upload_failed',
          message: error instanceof PostInputError ? error.message : 'The image could not be stored.',
        } });
      }
    }
    return results;
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
      mimeType: variant === 'original'
        ? media.mimeType
        : renditionFormats[(media.renditionManifest as Partial<RenditionManifest>).renditions
          ?.find((rendition) => rendition.variant === variant)?.format ?? 'webp'].mimeType,
    };
  }

  listForPost(postId: string): PublicMedia[] {
    return this.media.listByPostId(postId).map(publicMedia);
  }

  deleteImage(id: string): void {
    // Commit the logical deletion and its cleanup journal together before removing bytes.
    this.media.beginDeletion(id);
    const paths = this.media.pendingDeletionPaths(id);
    if (!paths) return;
    try {
      const root = fs.realpathSync(this.mediaRoot);
      const files = paths.map((relativePath) => {
        const file = path.resolve(root, relativePath);
        if (!file.startsWith(`${root}${path.sep}`)) throw new Error('Unsafe media path.');
        // Resolve parent symlinks as well as lexical traversal before unlinking anything.
        const parent = fs.realpathSync(path.dirname(file));
        if (parent !== root && !parent.startsWith(`${root}${path.sep}`)) {
          throw new Error('Unsafe media directory.');
        }
        return file;
      });
      for (const file of files) fs.rmSync(file, { force: true });
      this.media.completeDeletion(id);
    } catch {
      throw Object.assign(new Error('Photo removed; file cleanup is pending. Retry this deletion.'), {
        status: 503,
      });
    }
  }

  updateMetadata(id: string, input: UpdateMediaMetadataInput): PublicMedia | null {
    const current = this.media.getById(id);
    if (!current) return null;
    const altText = input.altText === undefined ? current.altText : input.altText;
    if (typeof altText !== 'string' || !altText.trim() || altText.length > 2_000) {
      throw new PostInputError('altText must be a non-empty string no longer than 2,000 characters.');
    }
    const caption = input.caption === undefined ? current.caption : input.caption;
    if (caption !== null && (typeof caption !== 'string' || caption.length > 5_000)) {
      throw new PostInputError('caption must be null or a string no longer than 5,000 characters.');
    }
    const focalX = input.focalX === undefined ? current.focalX : input.focalX;
    const focalY = input.focalY === undefined ? current.focalY : input.focalY;
    const validCoordinate = (value: unknown) => value === null
      || (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1);
    if (!validCoordinate(focalX) || !validCoordinate(focalY) || ((focalX === null) !== (focalY === null))) {
      throw new PostInputError('focalX and focalY must both be null or numbers from 0 through 1.');
    }
    const updated = this.media.updateMetadata(id, {
      altText: altText.trim(),
      caption: typeof caption === 'string' ? caption.trim() || null : caption,
      focalX: focalX as number | null,
      focalY: focalY as number | null,
    }, new Date().toISOString());
    return updated ? publicMedia(updated) : null;
  }

  reorder(postId: string, orderedIds: unknown): PublicMedia[] {
    if (!this.posts.getById(postId)) throw new PostInputError('postId does not identify a post.');
    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== 'string')) {
      throw new PostInputError('mediaIds must be an array of media IDs.');
    }
    const currentIds = this.media.listByPostId(postId).map((item) => item.id);
    const proposed = orderedIds as string[];
    if (
      proposed.length !== currentIds.length
      || new Set(proposed).size !== proposed.length
      || proposed.some((id) => !currentIds.includes(id))
    ) {
      throw new PostInputError('mediaIds must contain every photo for the post exactly once.');
    }
    return this.media.reorder(postId, proposed, new Date().toISOString()).map(publicMedia);
  }

  selectHero(postId: string, mediaId: unknown): string | null {
    if (mediaId !== null && typeof mediaId !== 'string') {
      throw new PostInputError('mediaId must be a media ID or null.');
    }
    if (typeof mediaId === 'string') {
      const selected = this.media.getById(mediaId);
      if (!selected || selected.postId !== postId) {
        throw new PostInputError('Hero media must belong to the post.');
      }
    }
    const post = this.posts.update(postId, { heroMediaId: mediaId });
    if (!post) throw new PostInputError('postId does not identify a post.');
    return post.heroMediaId;
  }
}
