export interface SocialPreviewRecord {
  postId: string;
  fingerprint: string;
  relativePath: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  byteSize: number;
  schemaVersion: number;
  selectedMediaIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SocialPreviewImage {
  alt: string;
  height: number;
  mimeType: 'image/jpeg';
  url: string;
  width: number;
}

export interface SocialPreviewStatus {
  image: SocialPreviewImage | null;
  schemaVersion: number;
  selectedMediaIds: string[];
  state: 'current' | 'missing' | 'none' | 'outdated';
}
