export interface MediaDerivatives {
  large?: string;
  thumbnail?: string;
}

export interface MediaRecord {
  id: string;
  postId: string;
  originalPath: string;
  derivatives: MediaDerivatives;
  mimeType: string;
  width: number | null;
  height: number | null;
  byteSize: number;
  checksumSha256: string;
  altText: string;
  focalX: number | null;
  focalY: number | null;
  displayOrder: number;
  createdAt: string;
}

export type MediaVariant = 'original' | keyof MediaDerivatives;
