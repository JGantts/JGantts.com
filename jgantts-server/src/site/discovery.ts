import type { Request } from 'express';
import type { MediaService } from '../media/media-service';
import type { PostService } from '../posts/post-service';
import { getRequestOrigin } from './metadata';

function escapeXml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function canonicalPostUrl(origin: string, slug: string): string {
  return new URL(`/posts/${encodeURIComponent(slug)}`, `${origin}/`).toString();
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
    const url = canonicalPostUrl(origin, post.slug);
    const title = post.title || post.excerpt || 'Post by Jacob Gantt';
    const images = media?.listForPost(post.id) ?? [];
    const imageLinks = images.map((image) => (
      `<link rel="enclosure" href="${escapeXml(new URL(image.urls.original, origin).toString())}" type="${escapeXml(image.mimeType)}" />`
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
    + `<id>${escapeXml(new URL('/posts', `${origin}/`).toString())}</id>`
    + `<title>JGantts.com posts</title>`
    + `<link rel="self" href="${escapeXml(new URL('/feed.xml', `${origin}/`).toString())}" />`
    + `<link rel="alternate" href="${escapeXml(new URL('/posts', `${origin}/`).toString())}" />`
    + `<updated>${escapeXml(updated)}</updated>`
    + `<author><name>Jacob Gantt</name></author>`
    + entries
    + `</feed>`;
}

export function renderSitemap(
  req: Request,
  posts: PostService,
  configuredSiteOrigin: string,
): string {
  const origin = getRequestOrigin(req, configuredSiteOrigin);
  const staticPaths = ['/', '/posts', '/photos', '/holmes', '/kovyalo'];
  const staticUrls = staticPaths.map((pathname) => (
    `<url><loc>${escapeXml(new URL(pathname, `${origin}/`).toString())}</loc></url>`
  ));
  const postUrls = posts.listAllPublished().map((post) => (
    `<url><loc>${escapeXml(canonicalPostUrl(origin, post.slug))}</loc>`
      + `<lastmod>${escapeXml(post.updatedAt)}</lastmod></url>`
  ));
  return `<?xml version="1.0" encoding="UTF-8"?>`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`
    + staticUrls.join('')
    + postUrls.join('')
    + `</urlset>`;
}
