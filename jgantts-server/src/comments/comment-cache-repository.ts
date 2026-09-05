import type { ContentDatabase } from '../db/database';
import type { MastodonCommentsResponse } from './types';

interface CacheRow {
  root_status_id: string;
  payload_json: string;
  fetched_at: string;
  expires_at: string;
}

export interface CommentCacheEntry {
  expiresAt: string;
  fetchedAt: string;
  payload: MastodonCommentsResponse;
  rootStatusId: string;
}

export class CommentCacheRepository {
  constructor(private readonly database: ContentDatabase) {}

  get(postId: string): CommentCacheEntry | null {
    const row = this.database.prepare(`
      SELECT root_status_id, payload_json, fetched_at, expires_at
      FROM mastodon_comment_cache WHERE post_id = ?
    `).get(postId) as CacheRow | undefined;
    if (!row) return null;
    try {
      return {
        expiresAt: row.expires_at,
        fetchedAt: row.fetched_at,
        payload: JSON.parse(row.payload_json) as MastodonCommentsResponse,
        rootStatusId: row.root_status_id,
      };
    } catch {
      this.database.prepare('DELETE FROM mastodon_comment_cache WHERE post_id = ?').run(postId);
      return null;
    }
  }

  put(input: {
    expiresAt: string;
    fetchedAt: string;
    payload: MastodonCommentsResponse;
    postId: string;
    remoteInstance: string;
    rootStatusId: string;
  }): void {
    this.database.prepare(`
      INSERT INTO mastodon_comment_cache (
        post_id, remote_instance, root_status_id, payload_json, fetched_at, expires_at
      ) VALUES (@postId, @remoteInstance, @rootStatusId, @payloadJson, @fetchedAt, @expiresAt)
      ON CONFLICT(post_id) DO UPDATE SET
        remote_instance = excluded.remote_instance,
        root_status_id = excluded.root_status_id,
        payload_json = excluded.payload_json,
        fetched_at = excluded.fetched_at,
        expires_at = excluded.expires_at
    `).run({ ...input, payloadJson: JSON.stringify(input.payload) });
  }
}
