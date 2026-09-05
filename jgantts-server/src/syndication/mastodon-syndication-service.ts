import { createHash } from 'node:crypto';
import type { PostService } from '../posts/post-service';
import { SyndicationRepository } from './syndication-repository';
import type { Syndication } from './types';

const MAX_TEASER_SOURCE_LENGTH = 5_000;

function codepoints(value: string): string[] {
  return Array.from(value);
}

export function buildMastodonStatus(teaser: string, canonicalUrl: string, limit: number): string {
  const suffix = `\n\n${canonicalUrl}`;
  const suffixLength = codepoints(suffix).length;
  if (suffixLength > limit) throw new Error('The canonical URL exceeds the Mastodon character limit.');
  const normalized = teaser.trim().replace(/\s+/g, ' ');
  if (!normalized) return canonicalUrl;
  const available = limit - suffixLength;
  const teaserCharacters = codepoints(normalized);
  if (teaserCharacters.length <= available) return `${normalized}${suffix}`;
  if (available < 2) return canonicalUrl;
  return `${teaserCharacters.slice(0, available - 1).join('').trimEnd()}…${suffix}`;
}

function validateTeaser(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') throw Object.assign(new Error('teaser must be a string.'), { status: 400 });
  if (value.length > MAX_TEASER_SOURCE_LENGTH) {
    throw Object.assign(new Error('teaser is too long.'), { status: 400 });
  }
  return value;
}

export class MastodonSyndicationService {
  constructor(
    private readonly repository: SyndicationRepository,
    private readonly posts: PostService,
    private readonly siteOrigin: string,
    private readonly mastodonOrigin: string,
    private readonly hasAccessToken: boolean,
  ) {}

  get enabled(): boolean {
    return Boolean(this.siteOrigin && this.mastodonOrigin && this.hasAccessToken);
  }

  getForPost(postId: string): Syndication | null {
    return this.repository.getLatestForPost(postId);
  }

  queue(postId: string, teaserValue?: unknown): { queued: boolean; syndication: Syndication } {
    this.assertConfigured();
    const post = this.posts.findById(postId);
    if (!post) throw Object.assign(new Error('Post not found.'), { status: 404 });
    const fallback = post.excerpt || post.title || '';
    const teaser = validateTeaser(teaserValue, fallback);
    return this.repository.queuePublication({
      canonicalUrl: `${this.siteOrigin}/posts/${encodeURIComponent(post.slug)}`,
      postId,
      remoteInstance: this.mastodonOrigin,
      teaser,
    });
  }

  queueEdit(postId: string, teaserValue?: unknown): Syndication {
    this.assertConfigured();
    const post = this.posts.findById(postId);
    if (!post) throw Object.assign(new Error('Post not found.'), { status: 404 });
    const syndication = this.repository.getLatestForPost(postId);
    if (!syndication) throw Object.assign(new Error('Post has not been syndicated.'), { status: 404 });
    const teaser = validateTeaser(teaserValue, post.excerpt || post.title || '');
    const canonicalUrl = `${this.siteOrigin}/posts/${encodeURIComponent(post.slug)}`;
    this.repository.queueEdit(syndication.id, {
      canonicalUrl,
      idempotencyKey: createHash('sha256')
        .update(`jgantts:mastodon:edit:${syndication.id}:${teaser}:${canonicalUrl}`)
        .digest('hex'),
      teaser,
    });
    return this.repository.getById(syndication.id) as Syndication;
  }

  retry(postId: string): Syndication {
    this.assertConfigured();
    const syndication = this.repository.getLatestForPost(postId);
    if (!syndication) throw Object.assign(new Error('Post has not been syndicated.'), { status: 404 });
    return this.repository.retry(syndication.id);
  }

  private assertConfigured(): void {
    if (!this.enabled) {
      throw Object.assign(new Error('Mastodon syndication is not configured.'), { status: 503 });
    }
  }
}
