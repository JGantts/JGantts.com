import type { PostService } from '../posts/post-service';
import { revisionedPostPath } from '../site/revision-url';
import { SyndicationRepository } from './syndication-repository';
import { buildPostTeaser } from './mastodon-syndication-service';
import type { Syndication } from './types';
import type { FacebookClientLike, FacebookPostCandidate } from './facebook-client';
import type { MediaService } from '../media/media-service';
import { resolvePostPreview } from '../site/post-preview';

export class FacebookSyndicationService {
  constructor(private readonly repository: SyndicationRepository, private readonly posts: PostService, private readonly siteOrigin: string, private readonly pageId: string, private readonly hasAccessToken: boolean, private readonly media?: MediaService) {}
  get enabled(): boolean { return Boolean(this.siteOrigin && this.pageId && this.hasAccessToken); }
  getForPost(postId: string): Syndication | null { return this.repository.getLatestForPost(postId, 'facebook'); }
  listForPost(postId: string): Syndication[] { return this.repository.listForPost(postId).filter((item) => item.destination === 'facebook'); }
  listPublicationHistory(postId: string) { return this.repository.listPublicationHistory(postId).filter((item) => item.destination === 'facebook'); }
  queue(postId: string): { queued: boolean; syndication: Syndication } {
    if (!this.enabled) throw Object.assign(new Error('Facebook syndication is not configured.'), { status: 503 });
    const post = this.posts.findById(postId); if (!post) throw Object.assign(new Error('Post not found.'), { status: 404 });
    const preview = resolvePostPreview(post, this.media?.listForPost(post.id) ?? []).token;
    const url = `${this.siteOrigin}${revisionedPostPath(post.slug, this.posts.currentRevision(post.id), this.posts.hasMultiplePublishedRevisions(post.id), preview)}`;
    return this.repository.queuePublication({ destination: 'facebook', canonicalUrl: url, postId, remoteInstance: `page:${this.pageId}`, teaser: buildPostTeaser(post) });
  }
  retry(postId: string): Syndication { const item = this.getForPost(postId); if (!item) throw Object.assign(new Error('Post has not been syndicated.'), { status: 404 }); return this.repository.retry(item.id); }
  async reconcile(postId: string, client: FacebookClientLike): Promise<{ state: string; candidates: FacebookPostCandidate[]; syndication: Syndication }> {
    const item = this.getForPost(postId); if (!item) throw Object.assign(new Error('Post has not been syndicated.'), { status: 404 });
    if (item.state !== 'uncertain') throw Object.assign(new Error('Only uncertain Facebook publications can be reconciled.'), { status: 409 });
    const payload = this.repository.getPublicationPayload(item.id); if (!payload) throw new Error('Facebook publication payload is unavailable.');
    const since = new Date(Date.parse(item.createdAt) - 10 * 60_000).toISOString();
    const until = new Date(Date.parse(item.updatedAt) + 10 * 60_000).toISOString();
    const candidates = (await client.findPagePosts(since, until)).filter((candidate) => candidate.link === payload.canonicalUrl && candidate.message === payload.teaser);
    if (candidates.length === 1) return { state: 'published', candidates, syndication: this.repository.attachRemote(item.id, candidates[0]) };
    return { state: 'uncertain', candidates, syndication: candidates.length === 0 ? this.repository.markNoMatch(item.id) : item };
  }
  resolve(postId: string, remote: { id: string; url: string }): Syndication {
    const item = this.getForPost(postId); if (!item) throw Object.assign(new Error('Post has not been syndicated.'), { status: 404 });
    if (!/^https:\/\/(www\.)?facebook\.com\//.test(remote.url) || !remote.id.trim()) throw Object.assign(new Error('A valid Facebook post ID and permalink are required.'), { status: 400 });
    return this.repository.resolveRemote(item.id, { id: remote.id.trim().slice(0, 200), url: remote.url });
  }
}
