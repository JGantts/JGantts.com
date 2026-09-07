import type { Request } from 'express';
import type { MediaService } from '../media/media-service';
import type { PostService } from '../posts/post-service';
import { getRequestOrigin } from './metadata';
import { revisionedPostPath } from './revision-url';

function escapeXml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function canonicalPostUrl(origin: string, posts: PostService, post: { id: string; slug: string }): string {
  return new URL(revisionedPostPath(post.slug, posts.currentRevision(post.id), posts.hasMultiplePublishedRevisions(post.id)), `${origin}/`).toString();
}

export function renderAtomFeed(
  req: Request,
  posts: PostService,
  media: MediaService | undefined,
  configuredSiteOrigin: string,
): string {
  const origin = getRequestOrigin(req, configuredSiteOrigin);
  const published = posts.listAllPublished().slice(0, 50);
  const updated = published[0]?.updatedAt ?? new Date(0).toISOString();
  const entries = published.map((post) => {
    const url = canonicalPostUrl(origin, posts, post);
    const title = post.title || post.excerpt || 'Post by Jacob Gantt';
    const images = media?.listForPost(post.id) ?? [];
    const imageLinks = images.map((image) => (
      `<link rel="enclosure" href="${escapeXml(new URL(image.urls.large, origin).toString())}" type="image/webp" />`
    )).join('');
    return `<entry>`
      + `<id>${escapeXml(url)}</id>`
      + `<title>${escapeXml(title)}</title>`
      + `<link rel="alternate" href="${escapeXml(url)}" />`
      + imageLinks
      + `<published>${escapeXml(post.publishedAt)}</published>`
      + `<updated>${escapeXml(post.updatedAt)}</updated>`
      + `<summary>${escapeXml(post.excerpt ?? '')}</summary>`
      + `<content type="html">${escapeXml(post.bodyHtml)}</content>`
      + `</entry>`;
  }).join('');

  return `<?xml version="1.0" encoding="utf-8"?>`
    + `<feed xmlns="http://www.w3.org/2005/Atom">`
    + `<id>${escapeXml(new URL('/photos', `${origin}/`).toString())}</id>`
    + `<title>JGantts.com posts</title>`
    + `<link rel="self" href="${escapeXml(new URL('/feed.xml', `${origin}/`).toString())}" />`
    + `<link rel="alternate" href="${escapeXml(new URL('/photos', `${origin}/`).toString())}" />`
    + `<updated>${escapeXml(updated)}</updated>`
    + `<author><name>Jacob Gantt</name></author>`
    + entries
    + `</feed>`;
}

export function renderSitemap(
  req: Request,
  posts: PostService,
  configuredSiteOrigin: string,
  media?: MediaService,
): string {
  const origin = getRequestOrigin(req, configuredSiteOrigin);
  const staticPaths = ['/', '/photos', '/holmes', '/kovyalo'];
  const staticUrls = staticPaths.map((pathname) => (
    `<url><loc>${escapeXml(new URL(pathname, `${origin}/`).toString())}</loc></url>`
  ));
  const postUrls = posts.listAllPublished().map((post) => (
    `<url><loc>${escapeXml(canonicalPostUrl(origin, posts, post))}</loc>`
      + `<lastmod>${escapeXml(post.updatedAt)}</lastmod>`
      + (media?.listForPost(post.id) ?? []).map((image) => (
        `<image:image><image:loc>${escapeXml(new URL(image.urls.large, origin).toString())}</image:loc></image:image>`
      )).join('')
      + '</url>'
  ));
  return `<?xml version="1.0" encoding="UTF-8"?>`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`
    + staticUrls.join('')
    + postUrls.join('')
    + `</urlset>`;
}
