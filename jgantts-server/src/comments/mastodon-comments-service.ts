import sanitizeHtml from 'sanitize-html';
import type { MastodonCommentsClientLike } from '../syndication/mastodon-client';
import type { SyndicationRepository } from '../syndication/syndication-repository';
import type { MastodonStatusContext } from '../syndication/types';
import { CommentCacheRepository } from './comment-cache-repository';
import type { MastodonComment, MastodonCommentAttachment, MastodonCommentsResponse } from './types';

const CACHE_TTL_MS = 2 * 60_000;
const MAX_COMMENTS = 500;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.slice(0, maximum) : '';
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function safeContent(value: unknown): string {
  return sanitizeHtml(text(value, 100_000), {
    allowedTags: ['p', 'br', 'span', 'a'],
    allowedAttributes: { a: ['href', 'rel', 'target'] },
    allowedSchemes: ['https'],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: 'a',
        attribs: {
          href: httpsUrl(attributes.href) ?? '#',
          rel: 'nofollow noopener noreferrer',
          target: '_blank',
        },
      }),
    },
  });
}

function attachments(value: unknown): MastodonCommentAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).flatMap((candidate) => {
    const item = record(candidate);
    if (!item || item.type !== 'image') return [];
    const url = httpsUrl(item.url);
    const previewUrl = httpsUrl(item.preview_url);
    if (!url || !previewUrl) return [];
    return [{
      description: item.description === null ? null : text(item.description, 2_000) || null,
      previewUrl,
      url,
    }];
  });
}

function normalizeContext(context: MastodonStatusContext, rootStatusId: string): {
  comments: MastodonComment[];
  truncated: boolean;
} {
  const candidates = context.descendants.slice(0, MAX_COMMENTS);
  const knownIds = new Set(candidates.map((candidate) => text(record(candidate)?.id, 200)).filter(Boolean));
  const comments = candidates.flatMap((candidate) => {
    const status = record(candidate);
    const account = record(status?.account);
    const id = text(status?.id, 200);
    const url = httpsUrl(status?.url);
    const accountUrl = httpsUrl(account?.url);
    const createdAt = text(status?.created_at, 100);
    if (!status || !account || !id || !url || !accountUrl || Number.isNaN(Date.parse(createdAt))) return [];
    const rawParentId = text(status.in_reply_to_id, 200) || null;
    const parentIsRoot = rawParentId === rootStatusId;
    const parentIsKnown = rawParentId ? knownIds.has(rawParentId) : false;
    const username = text(account.acct, 320) || text(account.username, 100) || 'unknown';
    return [{
      account: {
        avatarUrl: httpsUrl(account.avatar_static) ?? httpsUrl(account.avatar),
        displayName: text(account.display_name, 500) || username,
        handle: `@${username}`,
        url: accountUrl,
      },
      attachments: attachments(status.media_attachments),
      contentHtml: safeContent(status.content),
      createdAt: new Date(createdAt).toISOString(),
      id,
      orphaned: Boolean(rawParentId && !parentIsRoot && !parentIsKnown),
      parentId: parentIsKnown ? rawParentId : null,
      url,
    } satisfies MastodonComment];
  }).sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
  return { comments, truncated: context.descendants.length > MAX_COMMENTS };
}

export class MastodonCommentsService {
  constructor(
    private readonly cache: CommentCacheRepository,
    private readonly syndications: SyndicationRepository,
    private readonly mastodon: MastodonCommentsClientLike | null,
  ) {}

  async getForPost(postId: string, now = new Date()): Promise<MastodonCommentsResponse> {
    const syndication = this.syndications.getLatestForPost(postId);
    if (!syndication?.remoteStatusId || !syndication.remoteUrl || syndication.state !== 'published') {
      return {
        comments: [], fetchedAt: null, remoteUrl: null, stale: false, state: 'not_syndicated', truncated: false,
      };
    }

    const cached = this.cache.get(postId);
    const matchingCache = cached?.rootStatusId === syndication.remoteStatusId ? cached : null;
    if (matchingCache && Date.parse(matchingCache.expiresAt) > now.getTime()) return matchingCache.payload;
    if (!this.mastodon) {
      return matchingCache
        ? { ...matchingCache.payload, stale: true }
        : {
          comments: [], fetchedAt: null, remoteUrl: syndication.remoteUrl,
          stale: false, state: 'unavailable', truncated: false,
        };
    }

    try {
      const context = await this.mastodon.getStatusContext(syndication.remoteStatusId);
      const normalized = normalizeContext(context, syndication.remoteStatusId);
      const fetchedAt = now.toISOString();
      const payload: MastodonCommentsResponse = {
        comments: normalized.comments,
        fetchedAt,
        remoteUrl: syndication.remoteUrl,
        stale: false,
        state: 'available',
        truncated: normalized.truncated,
      };
      this.cache.put({
        expiresAt: new Date(now.getTime() + CACHE_TTL_MS).toISOString(),
        fetchedAt,
        payload,
        postId,
        remoteInstance: syndication.remoteInstance,
        rootStatusId: syndication.remoteStatusId,
      });
      return payload;
    } catch {
      return matchingCache
        ? { ...matchingCache.payload, stale: true }
        : {
          comments: [], fetchedAt: null, remoteUrl: syndication.remoteUrl,
          stale: false, state: 'unavailable', truncated: false,
        };
    }
  }
}
