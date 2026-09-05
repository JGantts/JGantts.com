import type { ContentDatabase } from '../db/database';
import { inTransaction } from '../db/database';
import { PostConflictError, PostInputError } from '../posts/errors';
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
  caption: string | null;
  focal_x: number | null;
  focal_y: number | null;
  display_order: number;
  processing_state: 'processing' | 'ready' | 'failed';
  processing_error: string | null;
  rendition_json: string;
  created_at: string;
  updated_at: string | null;
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
    caption: row.caption,
    focalX: row.focal_x,
    focalY: row.focal_y,
    displayOrder: row.display_order,
    processingState: row.processing_state,
    processingError: row.processing_error,
    renditionManifest: JSON.parse(row.rendition_json) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

export class MediaRepository {
  constructor(private readonly database: ContentDatabase) {}

  create(media: MediaRecord): MediaRecord {
    this.database.prepare(`
      INSERT INTO media (
        id, post_id, original_path, derived_json, mime_type, width, height,
        byte_size, checksum_sha256, alt_text, caption, focal_x, focal_y,
        display_order, processing_state, processing_error, rendition_json,
        created_at, updated_at
      ) VALUES (
        @id, @postId, @originalPath, @derivedJson, @mimeType, @width, @height,
        @byteSize, @checksumSha256, @altText, @caption, @focalX, @focalY,
        @displayOrder, @processingState, @processingError, @renditionJson,
        @createdAt, @updatedAt
      )
    `).run({
      ...media,
      derivedJson: JSON.stringify(media.derivatives),
      renditionJson: JSON.stringify(media.renditionManifest),
    });
    return media;
  }

  getById(id: string): MediaRecord | null {
    const row = this.database.prepare('SELECT * FROM media WHERE id = ?').get(id) as MediaRow | undefined;
    return row ? mapMedia(row) : null;
  }

  beginDeletion(id: string): void {
    inTransaction(this.database, () => {
      const media = this.getById(id);
      if (!media) return;
      const post = this.database.prepare('SELECT status FROM posts WHERE id = ?')
        .get(media.postId) as { status: string };
      if (post.status === 'published') {
        throw new PostConflictError('Unpublish the post before deleting its photos.');
      }
      const now = new Date().toISOString();
      this.database.prepare(`
        INSERT INTO media_deletions (media_id, paths_json, created_at) VALUES (?, ?, ?)
      `).run(id, JSON.stringify([media.originalPath, ...Object.values(media.derivatives)]), now);
      this.database.prepare(`
        UPDATE posts SET hero_media_id = CASE WHEN hero_media_id = ? THEN NULL ELSE hero_media_id END,
          updated_at = ? WHERE id = ?
      `).run(id, now, media.postId);
      this.database.prepare('DELETE FROM media WHERE id = ?').run(id);
      this.reorder(media.postId, this.listByPostId(media.postId).map((item) => item.id), now);
    });
  }

  pendingDeletionPaths(id: string): string[] | null {
    const row = this.database.prepare('SELECT paths_json FROM media_deletions WHERE media_id = ?')
      .get(id) as { paths_json: string } | undefined;
    return row ? JSON.parse(row.paths_json) as string[] : null;
  }

  completeDeletion(id: string): void {
    this.database.prepare('DELETE FROM media_deletions WHERE media_id = ?').run(id);
  }

  listByPostId(postId: string): MediaRecord[] {
    return (this.database.prepare(`
      SELECT * FROM media WHERE post_id = ? ORDER BY display_order, id
    `).all(postId) as MediaRow[]).map(mapMedia);
  }

  updateMetadata(
    id: string,
    changes: Pick<MediaRecord, 'altText' | 'caption' | 'focalX' | 'focalY'>,
    updatedAt: string,
  ): MediaRecord | null {
    const result = this.database.prepare(`
      UPDATE media SET
        alt_text = @altText,
        caption = @caption,
        focal_x = @focalX,
        focal_y = @focalY,
        updated_at = @updatedAt
      WHERE id = @id
    `).run({ id, ...changes, updatedAt });
    return result.changes ? this.getById(id) : null;
  }

  reorder(postId: string, orderedIds: string[], updatedAt: string): MediaRecord[] {
    return inTransaction(this.database, () => {
      // Validate membership in the same transaction as the writes: a gallery may
      // have changed since the service read it (for example in another process).
      const currentIds = this.listByPostId(postId).map((item) => item.id);
      if (orderedIds.length !== currentIds.length
        || new Set(orderedIds).size !== orderedIds.length
        || orderedIds.some((id) => !currentIds.includes(id))) {
        throw new PostInputError('mediaIds must contain every photo for the post exactly once.');
      }
      const update = this.database.prepare(`
        UPDATE media SET display_order = ?, updated_at = ? WHERE id = ? AND post_id = ?
      `);
      orderedIds.forEach((id, index) => update.run(index, updatedAt, id, postId));
      return this.listByPostId(postId);
    });
  }
}
