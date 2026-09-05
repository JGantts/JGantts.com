import type { Request } from 'express';
import type { PublicMedia } from '../media/media-service';
import type { Post } from '../posts/types';
import { escapeHtml, renderAppHtml, upsertMeta } from './html';
import { getPageMeta, getRequestOrigin, type ResolvedPageMeta } from './metadata';

export interface CanonicalPostPage extends Post {
  media: PublicMedia[];
}

function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function insertBeforeHeadClose(html: string, value: string): string {
  return html.replace(/<\/head\s*>/i, `  ${value}\n  </head>`);
}

function insertBeforeBodyClose(html: string, value: string): string {
  return html.replace(/<\/body\s*>/i, `  ${value}\n  </body>`);
}

function descriptionFor(post: Post): string {
  return post.excerpt?.trim() || 'A post from Jacob Gantt on JGantts.com.';
}

function titleFor(post: Post): string {
  return post.title?.trim() || 'Post by Jacob Gantt';
}

export function getCanonicalPostMeta(
  req: Request,
  post: CanonicalPostPage,
  configuredSiteOrigin: string,
): ResolvedPageMeta {
  const defaults = getPageMeta(req, configuredSiteOrigin);
  const origin = getRequestOrigin(req, configuredSiteOrigin);
  const image = post.media[0]?.urls.large;
  const title = titleFor(post);
  return {
    title: `${title} | JGantts`,
    description: descriptionFor(post),
    socialTitle: title,
    socialDescription: descriptionFor(post),
    socialImage: image ? new URL(image, `${origin}/`).toString() : defaults.socialImage,
    url: new URL(`/posts/${encodeURIComponent(post.slug)}`, `${origin}/`).toString(),
  };
}

export function renderCanonicalPostHtml(
  req: Request,
  appHtmlTemplate: string,
  post: CanonicalPostPage,
  configuredSiteOrigin: string,
): string {
  const meta = getCanonicalPostMeta(req, post, configuredSiteOrigin);
  let html = renderAppHtml(req, appHtmlTemplate, configuredSiteOrigin, meta, 'article');
  html = upsertMeta(html, 'property', 'article:published_time', post.publishedAt ?? '');
  html = upsertMeta(html, 'property', 'article:modified_time', post.updatedAt);
  html = insertBeforeHeadClose(
    html,
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
  );
  html = insertBeforeHeadClose(html, `<style>
    [data-server-rendered-post] { box-sizing: border-box; line-height: 1.6; margin: 2rem auto; max-width: 54rem; padding: 1.5rem; }
    [data-server-rendered-post] h1 { font-size: 2rem; font-weight: 700; line-height: 1.15; margin-bottom: 1rem; }
    [data-server-rendered-post] time { display: block; margin-bottom: 1.5rem; }
    [data-server-rendered-post] img { display: block; height: auto; margin: 1rem 0; max-width: 100%; }
    [data-server-rendered-post] p { margin: 1rem 0; }
  </style>`);

  const images = post.media.map((item) => new URL(item.urls.original, meta.url).toString());
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: titleFor(post),
    description: descriptionFor(post),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: meta.url,
    image: images,
    author: { '@type': 'Person', name: 'Jacob Gantt', url: new URL('/', meta.url).toString() },
  };
  html = insertBeforeHeadClose(
    html,
    `<script id="__POST_JSON_LD__" type="application/ld+json">${safeJson(jsonLd)}</script>`,
  );

  const mediaHtml = post.media.map((item) => (
    `<a href="${escapeHtml(item.urls.original)}">`
      + `<img src="${escapeHtml(item.urls.large)}" alt="${escapeHtml(item.altText)}" loading="eager" />`
      + '</a>'
  )).join('');
  const warningHtml = post.contentWarning
    ? `<p><strong>Content note:</strong> ${escapeHtml(post.contentWarning)}</p>`
    : '';
  const initialArticle = `<article data-server-rendered-post>`
    + `<h1>${escapeHtml(titleFor(post))}</h1>`
    + `<time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(post.publishedAt)}</time>`
    + warningHtml
    + mediaHtml
    + post.bodyHtml
    + '</article>';
  html = html.replace(
    /<div\s+id=(?:"app"|'app')\s*><\/div>/i,
    `<div id="app">${initialArticle}</div>`,
  );
  return insertBeforeBodyClose(
    html,
    `<script id="__POST_DATA__" type="application/json">${safeJson(post)}</script>`,
  );
}
