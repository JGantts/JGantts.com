import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import heicConvert = require('heic-convert');
import type { PostRepository } from '../posts/post-repository';
import { PostInputError } from '../posts/errors';
import { ensureMediaDirectories } from '../storage';
import { MediaRepository } from './media-repository';
import type {
  MediaRecord, MediaRendition, MediaVariant, RenditionFormat, RenditionManifest,
} from './types';

// Generous enough for modern camera originals while still bounding accidental
// uploads and decompression work. Derivatives remain optimized for delivery.
const MAX_IMAGE_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 80_000_000;
// Covers compact masonry cells through a high-density expanded viewer. The
// oriented source width is added when it falls between these stops, and widths
// above the source are omitted.
export const RESPONSIVE_IMAGE_WIDTHS = [320, 480, 768, 1_024, 1_600, 2_400] as const;
const MINIMUM_AVIF_WIDTH = 768;
const PLACEHOLDER_WIDTH = 32;
const renditionFormats: Record<RenditionFormat, { extension: string; mimeType: string }> = {
  avif: { extension: 'avif', mimeType: 'image/avif' },
  jpeg: { extension: 'jpg', mimeType: 'image/jpeg' },
  png: { extension: 'png', mimeType: 'image/png' },
  webp: { extension: 'webp', mimeType: 'image/webp' },
};
// HEIC/HEIF are accepted only as source files. Public pages always use the
// browser-safe responsive renditions generated below (AVIF, WebP, JPEG, PNG).
export const uploadSourceFormats = {
  avif: { extension: 'avif', mimeType: 'image/avif' },
  heif: { extension: 'heic', mimeType: 'image/heic' },
  jpeg: { extension: 'jpg', mimeType: 'image/jpeg' },
  png: { extension: 'png', mimeType: 'image/png' },
  webp: { extension: 'webp', mimeType: 'image/webp' },
} as const;

function sourceFormatFor(metadata: sharp.Metadata) {
  // libvips reports both AVIF and HEIC-family files as `heif`; compression
  // distinguishes AV1-backed AVIF from the HEVC-backed iPhone HEIC files.
  if (metadata.format === 'heif') {
    return metadata.compression === 'av1'
      ? uploadSourceFormats.avif
      : uploadSourceFormats.heif;
  }
  return metadata.format && uploadSourceFormats[metadata.format as keyof typeof uploadSourceFormats];
}

async function renditionInputFor(source: Buffer, metadata: sharp.Metadata): Promise<{
  buffer: Buffer;
  metadata: sharp.Metadata;
}> {
  if (sourceFormatFor(metadata) !== uploadSourceFormats.heif) return { buffer: source, metadata };

  try {
    // Sharp can inspect HEIC metadata without necessarily including the HEVC
    // decoder. Decode only a temporary working copy; original HEIC bytes remain
    // the authoritative stored source.
    const buffer = await heicConvert({ buffer: source, format: 'PNG' });
    const decodedMetadata = await sharp(buffer).metadata();
    if (!decodedMetadata.width || !decodedMetadata.height) throw new Error('Converted HEIC has no dimensions.');
    return { buffer, metadata: decodedMetadata };
  } catch {
    throw new PostInputError('The HEIC/HEIF image could not be decoded for browser-safe renditions.');
  }
}

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
  placeholder: (Omit<MediaRendition, 'format' | 'path' | 'purpose' | 'variant'> & {
    format: 'webp'; purpose: 'placeholder'; url: string; variant: string;
  }) | null;
  renditions: Array<Omit<MediaRendition, 'path'> & { purpose: 'responsive'; url: string }>;
  urls: Record<'original' | 'large' | 'thumbnail', string>;
}

export interface MediaFile {
  mimeType: string;
  path: string;
}

export interface UpdateMediaMetadataInput {
  title?: unknown;
  altText?: unknown;
  caption?: unknown;
  description?: unknown;
  location?: unknown;
  date?: unknown;
  time?: unknown;
  focalX?: unknown;
  focalY?: unknown;
}

interface StagedMediaFile {
  finalPath: string;
  rendition?: MediaRendition;
  stagedPath: string;
}

export interface MediaProcessingHooks {
  afterStage?: (files: ReadonlyArray<StagedMediaFile>) => void;
  beforePromote?: (file: Readonly<StagedMediaFile>, index: number) => void;
}

export interface RegenerationResult {
  id: string;
  renditionCount: number;
  status: 'failed' | 'planned' | 'regenerated';
  error?: string;
}

function publicMedia(media: MediaRecord, revision: number, versioned: boolean): PublicMedia {
  const base = `/media/${encodeURIComponent(media.id)}`;
  const withRevision = (url: string) => versioned ? `${url}?rev=${revision}` : url;
  const manifest = media.renditionManifest as Partial<RenditionManifest>;
  const storedRenditions = Array.isArray(manifest.renditions) ? manifest.renditions : [];
  const toPublicRendition = ({ path: _path, ...rendition }: MediaRendition) => ({
      ...rendition,
      url: withRevision(`${base}/${encodeURIComponent(rendition.variant)}`),
    });
  const renditions = storedRenditions
    .filter((rendition) => rendition.purpose !== 'placeholder')
    .map((rendition) => ({ ...toPublicRendition(rendition), purpose: 'responsive' as const }));
  const storedPlaceholder = storedRenditions.find((rendition) => rendition.purpose === 'placeholder');
  const placeholder = storedPlaceholder
    ? { ...toPublicRendition(storedPlaceholder), format: 'webp' as const,
      purpose: 'placeholder' as const }
    : null;
  // Explicit fields keep future storage and processing details private by default.
  return {
    id: media.id,
    title: media.title,
    postId: media.postId,
    mimeType: media.mimeType,
    width: media.width,
    height: media.height,
    byteSize: media.byteSize,
    checksumSha256: media.checksumSha256,
    description: media.description,
    location: media.location,
    date: media.date,
    time: media.time,
    altText: media.altText,
    caption: media.caption,
    focalX: media.focalX,
    focalY: media.focalY,
    displayOrder: media.displayOrder,
    processingState: media.processingState,
    placeholder,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
    renditions,
      urls: {
        original: withRevision(`${base}/original`),
        large: withRevision(`${base}/large`),
        thumbnail: withRevision(`${base}/thumbnail`),
    },
  };
}

function variantFor(format: RenditionFormat, width: number, suffix = ''): string {
  // Keep the width-only WebP URL introduced with the responsive pipeline stable.
  return `${format === 'webp' ? `w-${width}` : `${format}-w-${width}`}${suffix}`;
}

async function writeRendition(
  buffer: Buffer,
  format: RenditionFormat,
  width: number,
  outputPath: string,
): Promise<sharp.OutputInfo> {
  // Sharp uses embedded input profiles during conversion. Force every public
  // rendition into device-independent sRGB and deliberately avoid all metadata-
  // retention methods so EXIF/GPS, XMP, IPTC, and the source ICC profile are
  // stripped from the encoded output.
  const image = sharp(buffer).autoOrient().resize({ width, withoutEnlargement: true })
    .toColourspace('srgb');
  if (format === 'avif') return image.avif({ quality: 58, effort: 4 }).toFile(outputPath);
  if (format === 'jpeg') return image.jpeg({ quality: width <= 480 ? 80 : 86 }).toFile(outputPath);
  if (format === 'png') return image.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(outputPath);
  return image.webp({ quality: width <= 480 ? 78 : 84 }).toFile(outputPath);
}

async function writePlaceholder(buffer: Buffer, outputPath: string): Promise<sharp.OutputInfo> {
  return sharp(buffer).autoOrient().resize({
    width: PLACEHOLDER_WIDTH,
    height: PLACEHOLDER_WIDTH,
    fit: 'inside',
    withoutEnlargement: true,
  })
    .toColourspace('srgb').blur(1).webp({ quality: 25, effort: 4 }).toFile(outputPath);
}

function responsiveWidths(sourceWidth: number): number[] {
  return Array.from(new Set([
    ...RESPONSIVE_IMAGE_WIDTHS.filter((width) => width <= sourceWidth),
    ...(sourceWidth < RESPONSIVE_IMAGE_WIDTHS.at(-1)! ? [sourceWidth] : []),
  ])).sort((left, right) => left - right);
}

async function stageRenditionSet(
  buffer: Buffer,
  metadata: sharp.Metadata,
  fileStem: string,
  stagingDirectory: string,
  derivedDirectory: string,
  variantSuffix = '',
): Promise<{
  derivatives: Record<string, string>;
  renditions: MediaRendition[];
  stagedFiles: StagedMediaFile[];
}> {
  const renditions: MediaRendition[] = [];
  const derivatives: Record<string, string> = {};
  const stagedFiles: StagedMediaFile[] = [];
  const addRendition = (rendition: MediaRendition, name: string, stagedPath: string) => {
    renditions.push(rendition);
    derivatives[rendition.variant] = rendition.path;
    stagedFiles.push({
      finalPath: path.join(derivedDirectory, name), rendition, stagedPath,
    });
  };

  const placeholderVariant = `placeholder${variantSuffix}`;
  const placeholderName = `${fileStem}-${placeholderVariant}.webp`;
  const placeholderPath = path.join(stagingDirectory, placeholderName);
  const placeholderInfo = await writePlaceholder(buffer, placeholderPath);
  addRendition({
    byteSize: placeholderInfo.size,
    colorSpace: 'srgb',
    format: 'webp',
    height: placeholderInfo.height,
    path: path.posix.join('derived', placeholderName),
    privateMetadataStripped: true,
    purpose: 'placeholder',
    variant: placeholderVariant,
    width: placeholderInfo.width,
  }, placeholderName, placeholderPath);
  if (variantSuffix) derivatives.placeholder = path.posix.join('derived', placeholderName);

  for (const width of responsiveWidths(metadata.autoOrient.width)) {
    const outputFormats: RenditionFormat[] = [
      'webp',
      ...(width >= MINIMUM_AVIF_WIDTH ? ['avif' as const] : []),
      metadata.hasAlpha ? 'png' : 'jpeg',
    ];
    for (const outputFormat of outputFormats) {
      const variant = variantFor(outputFormat, width, variantSuffix);
      const name = `${fileStem}-${variant}.${renditionFormats[outputFormat].extension}`;
      const outputPath = path.join(stagingDirectory, name);
      const info = await writeRendition(buffer, outputFormat, width, outputPath);
      addRendition({
        byteSize: info.size,
        colorSpace: 'srgb',
        format: outputFormat,
        height: info.height,
        path: path.posix.join('derived', name),
        privateMetadataStripped: true,
        purpose: 'responsive',
        variant,
        width: info.width,
      }, name, outputPath);
      if (variantSuffix) derivatives[variantFor(outputFormat, width)] = path.posix.join('derived', name);
    }
  }
  const webpRenditions = renditions.filter((rendition) =>
    rendition.format === 'webp' && rendition.purpose === 'responsive');
  const closestPath = (target: number) => webpRenditions.reduce((closest, rendition) =>
    Math.abs(rendition.width - target) < Math.abs(closest.width - target) ? rendition : closest).path;
  derivatives.thumbnail = closestPath(480);
  derivatives.large = closestPath(1_600);
  return { derivatives, renditions, stagedFiles };
}

async function verifyStagedFiles(
  files: StagedMediaFile[],
  source?: { buffer: Buffer; checksum: string },
): Promise<void> {
  for (const file of files) {
    const stat = fs.statSync(file.stagedPath);
    if (!stat.isFile() || stat.size <= 0) throw new Error('Staged media verification failed.');
    if (!file.rendition) {
      if (!source) throw new Error('Staged source verification failed.');
      const actualChecksum = createHash('sha256').update(fs.readFileSync(file.stagedPath)).digest('hex');
      if (stat.size !== source.buffer.length || actualChecksum !== source.checksum) {
        throw new Error('Staged source verification failed.');
      }
      continue;
    }
    const stagedMetadata = await sharp(file.stagedPath).metadata();
    const expectedFormat = file.rendition.format === 'avif' ? 'heif' : file.rendition.format;
    if (
      stagedMetadata.format !== expectedFormat
      || stagedMetadata.width !== file.rendition.width
      || stagedMetadata.height !== file.rendition.height
      || stat.size !== file.rendition.byteSize
    ) throw new Error('Staged rendition verification failed.');
  }
}

function promoteStagedFiles(
  files: StagedMediaFile[],
  promotedPaths: string[],
  hooks: MediaProcessingHooks,
): void {
  files.forEach((file, index) => {
    hooks.beforePromote?.(file, index);
    if (fs.existsSync(file.finalPath)) throw new Error('Media destination already exists.');
    fs.renameSync(file.stagedPath, file.finalPath);
    promotedPaths.push(file.finalPath);
  });
}

function cleanStaleStagingDirectories(mediaRoot: string): void {
  for (const entry of fs.readdirSync(mediaRoot, { withFileTypes: true })) {
    if (!entry.name.startsWith('.staging-') || (!entry.isDirectory() && !entry.isSymbolicLink())) continue;
    const ownerPid = Number(entry.name.split('-')[1]);
    if (Number.isInteger(ownerPid) && ownerPid > 0) {
      try {
        process.kill(ownerPid, 0);
        continue;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EPERM') continue;
      }
    } else {
      const age = Date.now() - fs.lstatSync(path.join(mediaRoot, entry.name)).mtimeMs;
      if (age < 60 * 60 * 1_000) continue;
    }
    fs.rmSync(path.join(mediaRoot, entry.name), { recursive: true, force: true });
  }
}

export class MediaService {
  private readonly directories;

  constructor(
    private readonly media: MediaRepository,
    private readonly posts: PostRepository,
    private readonly mediaRoot: string,
    private readonly processingHooks: MediaProcessingHooks = {},
  ) {
    this.directories = ensureMediaDirectories(mediaRoot);
    cleanStaleStagingDirectories(mediaRoot);
  }

  async uploadImage(input: UploadImageInput): Promise<PublicMedia> {
    if (!this.posts.getById(input.postId)) throw new PostInputError('postId does not identify a post.');
    if (!Buffer.isBuffer(input.buffer) || input.buffer.length === 0) {
      throw new PostInputError('An image file is required.');
    }
    if (input.buffer.length > MAX_IMAGE_BYTES) throw new PostInputError('Image exceeds the 100 MB limit.');
    if (
      typeof input.altText !== 'string'
      || input.altText.length > 2_000
    ) {
      throw new PostInputError('altText must be a string no longer than 2,000 characters.');
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
    const format = sourceFormatFor(metadata);
    if (!format || !metadata.width || !metadata.height) {
      throw new PostInputError('Only JPEG, PNG, WebP, AVIF, and HEIC/HEIF images are supported.');
    }
    if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
      throw new PostInputError('Image exceeds the 80 megapixel safety limit.');
    }
    const renditionInput = await renditionInputFor(input.buffer, metadata);

    const id = randomUUID();
    const originalName = `${id}.${format.extension}`;
    const originalPath = path.join(this.directories.originals, originalName);
    const stagingDirectory = fs.mkdtempSync(path.join(this.mediaRoot, `.staging-${process.pid}-`));
    const stagedFiles: StagedMediaFile[] = [];
    const promotedPaths: string[] = [];

    try {
      const stagedOriginalPath = path.join(stagingDirectory, originalName);
      fs.writeFileSync(stagedOriginalPath, input.buffer, { flag: 'wx', mode: 0o640 });
      stagedFiles.push({ finalPath: originalPath, stagedPath: stagedOriginalPath });
      const stagedSet = await stageRenditionSet(
        renditionInput.buffer, renditionInput.metadata, id, stagingDirectory, this.directories.derived,
      );
      const { derivatives, renditions } = stagedSet;
      stagedFiles.push(...stagedSet.stagedFiles);

      this.processingHooks.afterStage?.(stagedFiles);
      const expectedChecksum = createHash('sha256').update(input.buffer).digest('hex');
      await verifyStagedFiles(stagedFiles, { buffer: input.buffer, checksum: expectedChecksum });
      promoteStagedFiles(stagedFiles, promotedPaths, this.processingHooks);

      const createdAt = new Date().toISOString();
      const created = this.media.create({
        id,
        title: null,
        postId: input.postId,
        originalPath: path.posix.join('originals', originalName),
        derivatives,
        mimeType: format.mimeType,
        // Source bytes stay immutable; layout dimensions describe the oriented
        // full-resolution composition, before derivative resizing.
        width: renditionInput.metadata.autoOrient.width,
        height: renditionInput.metadata.autoOrient.height,
        byteSize: input.buffer.length,
        checksumSha256: expectedChecksum,
        // Editorial metadata is author-owned. Never infer these values from
        // EXIF/XMP (especially GPS coordinates or capture timestamps).
        description: null,
        location: null,
        date: null,
        time: null,
        altText: input.altText.trim(),
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
      });
      if (this.posts.getById(input.postId)?.status === 'published') this.posts.update(input.postId, {});
      return publicMedia(created, this.posts.getCurrentRevision(input.postId), this.posts.getPublishedRevisionCount(input.postId) > 1);
    } catch (error) {
      for (const promotedPath of promotedPaths) fs.rmSync(promotedPath, { force: true });
      throw error;
    } finally {
      fs.rmSync(stagingDirectory, { recursive: true, force: true });
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
    const revision = this.posts.getCurrentRevision(postId);
    const versioned = this.posts.getPublishedRevisionCount(postId) > 1;
    return this.media.listByPostId(postId).map((media) => publicMedia(media, revision, versioned));
  }

  async regenerateAll(options: { concurrency?: number; dryRun?: boolean } = {}): Promise<RegenerationResult[]> {
    const concurrency = options.concurrency ?? 2;
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
      throw new PostInputError('concurrency must be an integer from 1 through 8.');
    }
    const records = this.media.listAll();
    const results = new Array<RegenerationResult>(records.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < records.length) {
        const index = cursor++;
        const record = records[index];
        try {
          results[index] = await this.regenerateImage(record, Boolean(options.dryRun));
        } catch (error) {
          results[index] = {
            id: record.id,
            renditionCount: 0,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown regeneration failure.',
          };
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, records.length) }, worker));
    return results;
  }

  private async regenerateImage(record: MediaRecord, dryRun: boolean): Promise<RegenerationResult> {
    const source = this.getFile(record.id, 'original');
    if (!source) throw new Error('Stored source file is missing or unsafe.');
    const buffer = fs.readFileSync(source.path);
    const checksum = createHash('sha256').update(buffer).digest('hex');
    if (checksum !== record.checksumSha256) throw new Error('Stored source checksum does not match the database.');
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height || !sourceFormatFor(metadata)) {
      throw new Error('Stored source is not a supported readable image.');
    }
    if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
      throw new Error('Stored source exceeds the 80 megapixel safety limit.');
    }
    const renditionInput = await renditionInputFor(buffer, metadata);
    const widths = responsiveWidths(renditionInput.metadata.autoOrient.width);
    const renditionCount = 1 + widths.reduce(
      (count, width) => count + 2 + (width >= MINIMUM_AVIF_WIDTH ? 1 : 0),
      0,
    );
    if (dryRun) return { id: record.id, renditionCount, status: 'planned' };

    const generation = randomUUID().replaceAll('-', '').slice(0, 8);
    const suffix = `-v-${generation}`;
    const stagingDirectory = fs.mkdtempSync(path.join(this.mediaRoot, `.staging-${process.pid}-`));
    const promotedPaths: string[] = [];
    let updated = false;
    try {
      const stagedSet = await stageRenditionSet(
        renditionInput.buffer, renditionInput.metadata, `${record.id}-${generation}`, stagingDirectory, this.directories.derived, suffix,
      );
      this.processingHooks.afterStage?.(stagedSet.stagedFiles);
      await verifyStagedFiles(stagedSet.stagedFiles);
      promoteStagedFiles(stagedSet.stagedFiles, promotedPaths, this.processingHooks);
      const replacement = this.media.replaceRenditions(record.id, {
        derivatives: stagedSet.derivatives,
        height: renditionInput.metadata.autoOrient.height,
        renditionManifest: { version: 1, renditions: stagedSet.renditions },
        width: renditionInput.metadata.autoOrient.width,
      }, new Date().toISOString());
      if (!replacement) throw new Error('Media record disappeared during regeneration.');
      updated = true;

      const newPaths = new Set(Object.values(stagedSet.derivatives));
      for (const oldRelativePath of new Set(Object.values(record.derivatives))) {
        if (!oldRelativePath || newPaths.has(oldRelativePath)) continue;
        const oldPath = path.resolve(this.mediaRoot, oldRelativePath);
        if (oldPath.startsWith(`${path.resolve(this.mediaRoot)}${path.sep}`)) {
          try { fs.rmSync(oldPath, { force: true }); } catch { /* Leave orphan cleanup to the audit command. */ }
        }
      }
      return { id: record.id, renditionCount: stagedSet.renditions.length, status: 'regenerated' };
    } catch (error) {
      if (!updated) for (const promotedPath of promotedPaths) fs.rmSync(promotedPath, { force: true });
      throw error;
    } finally {
      fs.rmSync(stagingDirectory, { recursive: true, force: true });
    }
  }

  deleteImage(id: string): void {
    // Commit the logical deletion and its cleanup journal together before removing bytes.
    const media = this.media.getById(id);
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
      if (media) this.posts.update(media.postId, {});
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
    if (typeof altText !== 'string' || altText.length > 2_000) {
      throw new PostInputError('altText must be a string no longer than 2,000 characters.');
    }
    const caption = input.caption === undefined ? current.caption : input.caption;
    if (caption !== null && (typeof caption !== 'string' || caption.length > 5_000)) {
      throw new PostInputError('caption must be null or a string no longer than 5,000 characters.');
    }
    const optionalText = (value: unknown, field: string, maximum: number): string | null => {
      if (value === null) return null;
      if (typeof value !== 'string' || value.length > maximum) {
        throw new PostInputError(`${field} must be null or a string no longer than ${maximum.toLocaleString()} characters.`);
      }
      return value.trim() || null;
    };
    const description = input.description === undefined
      ? current.description : optionalText(input.description, 'description', 5_000);
    const title = input.title === undefined ? current.title : optionalText(input.title, 'title', 200);
    const location = input.location === undefined
      ? current.location : optionalText(input.location, 'location', 500);
    const date = input.date === undefined ? current.date : validateEditorialDate(input.date);
    const time = input.time === undefined ? current.time : validateEditorialTime(input.time);
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
      title,
      description,
      location,
      date,
      time,
      focalX: focalX as number | null,
      focalY: focalY as number | null,
    }, new Date().toISOString());
    if (!updated) return null;
    this.posts.update(updated.postId, {});
    return publicMedia(updated, this.posts.getCurrentRevision(updated.postId), this.posts.getPublishedRevisionCount(updated.postId) > 1);
  }

  currentRevisionForMedia(id: string): number | null {
    const media = this.media.getById(id);
    return media ? this.posts.getCurrentRevision(media.postId) : null;
  }

  hasMultiplePublishedRevisionsForMedia(id: string): boolean {
    const media = this.media.getById(id);
    return media ? this.posts.getPublishedRevisionCount(media.postId) > 1 : false;
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
    const reordered = this.media.reorder(postId, proposed, new Date().toISOString());
    this.posts.update(postId, {});
    const nextRevision = this.posts.getCurrentRevision(postId);
    const nextVersioned = this.posts.getPublishedRevisionCount(postId) > 1;
    return reordered.map((media) => publicMedia(media, nextRevision, nextVersioned));
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

function validateEditorialDate(value: unknown): number | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 10000101 || value > 99991231) {
    throw new PostInputError('date must be a valid YYYYMMDD integer or null.');
  }
  const text = String(value);
  const year = Number(text.slice(0, 4));
  const month = Number(text.slice(4, 6));
  const day = Number(text.slice(6, 8));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new PostInputError('date must be a valid YYYYMMDD integer or null.');
  }
  return value as number;
}

function validateEditorialTime(value: unknown): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):(?:00|15|20|30|40|45)$/.test(value)) {
    throw new PostInputError('time must use 24-hour HH:mm format at an allowed minute interval (:00, :15, :20, :30, :40, or :45), or be null.');
  }
  return value;
}
