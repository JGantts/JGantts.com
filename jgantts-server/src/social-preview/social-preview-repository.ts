import type { ContentDatabase } from '../db/database';
import type { SocialPreviewRecord } from './types';

interface SocialPreviewRow {
  post_id: string;
  fingerprint: string;
  relative_path: string;
  mime_type: 'image/jpeg';
  width: number;
  height: number;
  byte_size: number;
  schema_version: number;
  selected_media_json: string;
  created_at: string;
  updated_at: string;
}

function mapRecord(row: SocialPreviewRow): SocialPreviewRecord {
  return {
    postId: row.post_id,
    fingerprint: row.fingerprint,
    relativePath: row.relative_path,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    byteSize: row.byte_size,
    schemaVersion: row.schema_version,
    selectedMediaIds: JSON.parse(row.selected_media_json) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SocialPreviewRepository {
  constructor(private readonly database: ContentDatabase) {}

  getForPost(postId: string): SocialPreviewRecord | null {
    const row = this.database.prepare('SELECT * FROM social_previews WHERE post_id = ?')
      .get(postId) as SocialPreviewRow | undefined;
    return row ? mapRecord(row) : null;
  }

  upsert(record: SocialPreviewRecord): SocialPreviewRecord {
    this.database.prepare(`
      INSERT INTO social_previews (
        post_id, fingerprint, relative_path, mime_type, width, height, byte_size,
        schema_version, selected_media_json, created_at, updated_at
      ) VALUES (
        @postId, @fingerprint, @relativePath, @mimeType, @width, @height, @byteSize,
        @schemaVersion, @selectedMediaJson, @createdAt, @updatedAt
      )
      ON CONFLICT(post_id) DO UPDATE SET
        fingerprint = excluded.fingerprint,
        relative_path = excluded.relative_path,
        mime_type = excluded.mime_type,
        width = excluded.width,
        height = excluded.height,
        byte_size = excluded.byte_size,
        schema_version = excluded.schema_version,
        selected_media_json = excluded.selected_media_json,
        updated_at = excluded.updated_at
    `).run({ ...record, selectedMediaJson: JSON.stringify(record.selectedMediaIds) });
    return this.getForPost(record.postId)!;
  }
}
