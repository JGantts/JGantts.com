import type { ContentDatabase } from '../db/database';
import type { MediaDerivatives, MediaRecord } from './types';

interface MediaRow {
  id: string;
  post_id: string;
  original_path: string;
  derived_json: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  byte_size: number;
  checksum_sha256: string;
  alt_text: string;
  focal_x: number | null;
  focal_y: number | null;
  display_order: number;
  created_at: string;
}

function mapMedia(row: MediaRow): MediaRecord {
  return {
    id: row.id,
    postId: row.post_id,
    originalPath: row.original_path,
    derivatives: JSON.parse(row.derived_json) as MediaDerivatives,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    byteSize: row.byte_size,
    checksumSha256: row.checksum_sha256,
    altText: row.alt_text,
    focalX: row.focal_x,
    focalY: row.focal_y,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  };
}

export class MediaRepository {
  constructor(private readonly database: ContentDatabase) {}

  create(media: MediaRecord): MediaRecord {
    this.database.prepare(`
      INSERT INTO media (
        id, post_id, original_path, derived_json, mime_type, width, height,
        byte_size, checksum_sha256, alt_text, focal_x, focal_y, display_order,
        created_at
      ) VALUES (
        @id, @postId, @originalPath, @derivedJson, @mimeType, @width, @height,
        @byteSize, @checksumSha256, @altText, @focalX, @focalY, @displayOrder,
        @createdAt
      )
    `).run({ ...media, derivedJson: JSON.stringify(media.derivatives) });
    return media;
  }

  getById(id: string): MediaRecord | null {
    const row = this.database.prepare('SELECT * FROM media WHERE id = ?').get(id) as MediaRow | undefined;
    return row ? mapMedia(row) : null;
  }

  listByPostId(postId: string): MediaRecord[] {
    return (this.database.prepare(`
      SELECT * FROM media WHERE post_id = ? ORDER BY display_order, id
    `).all(postId) as MediaRow[]).map(mapMedia);
  }
}
