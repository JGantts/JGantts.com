export interface MediaDerivatives {
  [variant: string]: string | undefined;
  large?: string;
  thumbnail?: string;
}

export interface MediaRendition {
  byteSize: number;
  colorSpace: 'srgb';
  format: RenditionFormat;
  height: number;
  path: string;
  privateMetadataStripped: true;
  purpose: 'placeholder' | 'responsive';
  variant: string;
  width: number;
}

export type RenditionFormat = 'avif' | 'jpeg' | 'png' | 'webp';

export interface RenditionManifest {
  renditions: MediaRendition[];
  version: 1;
}

export interface MediaRecord {
  id: string;
  description: string | null;
  location: string | null;
  date: number | null;
  time: string | null;
  postId: string;
  originalPath: string;
  derivatives: MediaDerivatives;
  mimeType: string;
  width: number | null;
  height: number | null;
  byteSize: number;
  checksumSha256: string;
  altText: string;
  caption: string | null;
  focalX: number | null;
  focalY: number | null;
  displayOrder: number;
  processingState: 'processing' | 'ready' | 'failed';
  processingError: string | null;
  renditionManifest: RenditionManifest | Record<string, never>;
  createdAt: string;
  updatedAt: string;
}

export type MediaVariant = 'original' | string;
