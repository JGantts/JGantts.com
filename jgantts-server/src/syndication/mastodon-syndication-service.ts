import { createHash } from 'node:crypto';
import type { PostService } from '../posts/post-service';
import type { Post } from '../posts/types';
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
  const normalized = teaser.trim().split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join('\n');
  if (!normalized) return canonicalUrl;
  const available = limit - suffixLength;
  const teaserCharacters = codepoints(normalized);
  if (teaserCharacters.length <= available) return `${normalized}${suffix}`;
  if (available < 2) return canonicalUrl;
  return `${teaserCharacters.slice(0, available - 1).join('').trimEnd()}…${suffix}`;
}

export function buildPostTeaser(post: Pick<Post, 'title' | 'location' | 'date' | 'time'>): string {
  let dateAndTime = '';
  if (post.date) {
    const value = String(post.date);
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' })
      .format(new Date(Date.UTC(year, month - 1, day)));
    const remainder = day % 100;
    const finalDigit = day % 10;
    const ordinal = remainder >= 11 && remainder <= 13 ? 'th' : finalDigit === 1 ? 'st' : finalDigit === 2 ? 'nd' : finalDigit === 3 ? 'rd' : 'th';
    dateAndTime = `${year}, ${monthName} ${day}${ordinal}`;
  }
  if (post.time) {
    const hour = Number(post.time.slice(0, 2));
    const period = hour === 0 || hour === 24 ? 'midnight' : hour < 5 ? 'at night' : hour < 12 ? 'in the morning' : hour === 12 ? 'noon' : hour < 17 ? 'in the afternoon' : hour < 21 ? 'in the evening' : 'at night';
    const formattedTime = `${post.time} ${period}`;
    dateAndTime = dateAndTime ? `${dateAndTime}, ${formattedTime}` : formattedTime;
  }
  return [post.title, post.location, dateAndTime].filter(Boolean).join('\n').slice(0, MAX_TEASER_SOURCE_LENGTH);
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

  queue(postId: string): { queued: boolean; syndication: Syndication } {
    this.assertConfigured();
    const post = this.posts.findById(postId);
    if (!post) throw Object.assign(new Error('Post not found.'), { status: 404 });
    const teaser = buildPostTeaser(post);
    return this.repository.queuePublication({
      canonicalUrl: `${this.siteOrigin}/photos/${encodeURIComponent(post.slug)}`,
      postId,
      remoteInstance: this.mastodonOrigin,
      teaser,
    });
  }

  queueEdit(postId: string): Syndication {
    this.assertConfigured();
    const post = this.posts.findById(postId);
    if (!post) throw Object.assign(new Error('Post not found.'), { status: 404 });
    const syndication = this.repository.getLatestForPost(postId);
    if (!syndication) throw Object.assign(new Error('Post has not been syndicated.'), { status: 404 });
    const teaser = buildPostTeaser(post);
    const canonicalUrl = `${this.siteOrigin}/photos/${encodeURIComponent(post.slug)}`;
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
