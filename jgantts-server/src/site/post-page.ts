import type { Request } from 'express';
import type { PublicMedia } from '../media/media-service';
import type { Post } from '../posts/types';
import { escapeHtml, renderAppHtml, upsertMeta } from './html';
import { getPageMeta, getRequestOrigin, type ResolvedPageMeta } from './metadata';
import { revisionedPostPath } from './revision-url';

export interface CanonicalPostPage extends Post {
  build?: string;
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

function firstLine(value: string | null): string {
  return value?.split(/\r?\n/, 1)[0]?.trim() ?? '';
}

function editorialDateTimeFor(post: Post): string {
  let formatted = '';
  if (post.date) {
    const value = String(post.date);
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' })
      .format(new Date(Date.UTC(year, month - 1, day)));
    const remainder = day % 100;
    const suffix = remainder >= 11 && remainder <= 13
      ? 'th'
      : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th';
    formatted = `${year}, ${monthName} ${day}${suffix}`;
  }
  if (post.time) {
    const hour = Number(post.time.slice(0, 2));
    let period = 'at night';
    if (hour === 0 || hour === 24) period = 'midnight';
    else if (hour < 5) period = 'at night';
    else if (hour < 12) period = 'in the morning';
    else if (hour === 12) period = 'noon';
    else if (hour < 17) period = 'in the afternoon';
    else if (hour < 21) period = 'in the evening';
    const formattedTime = `${post.time} ${period}`;
    formatted = formatted ? `${formatted}, ${formattedTime}` : formattedTime;
  }
  return formatted;
}

function descriptionFor(post: Post): string {
  const lines = [
    firstLine(post.title),
    firstLine(post.bodyMarkdown),
    firstLine(post.location),
    editorialDateTimeFor(post),
  ].filter(Boolean);
  return lines.join('\n') || 'A post from Jacob Gantt on JGantts.com.';
}

function titleFor(post: Post): string {
  return post.title?.trim() || 'Post by Jacob Gantt';
}

export function heroMediaFor(post: CanonicalPostPage): PublicMedia | null {
  return post.media.find((item) => item.id === post.heroMediaId) ?? post.media[0] ?? null;
}

function socialImageFor(post: CanonicalPostPage) {
  const hero = heroMediaFor(post);
  if (!hero) return null;
  const compatibleRendition = hero.renditions
    .filter((rendition) => rendition.format === 'jpeg' || rendition.format === 'png')
    .sort((left, right) => right.width - left.width)[0];
  if (compatibleRendition) {
    return {
      height: compatibleRendition.height,
      mimeType: compatibleRendition.format === 'png' ? 'image/png' : 'image/jpeg',
      url: compatibleRendition.url,
      width: compatibleRendition.width,
    };
  }
  return {
    height: hero.height,
    mimeType: hero.mimeType,
    url: hero.urls.original,
    width: hero.width,
  };
}

export function getCanonicalPostMeta(
  req: Request,
  post: CanonicalPostPage,
  configuredSiteOrigin: string,
): ResolvedPageMeta {
  const defaults = getPageMeta(req, configuredSiteOrigin);
  const origin = getRequestOrigin(req, configuredSiteOrigin);
  const image = socialImageFor(post)?.url;
  const title = titleFor(post);
  return {
    title: `${title} | JGantts`,
    description: descriptionFor(post),
    socialTitle: title,
    socialDescription: descriptionFor(post),
    socialImage: image ? new URL(image, `${origin}/`).toString() : defaults.socialImage,
    url: new URL(revisionedPostPath(post.slug, postRevision(post), Boolean(post.revision), post.build), `${origin}/`).toString(),
  };
}

function postRevision(post: Post): number {
  // The server injects the current revision on the page object.
  return post.revision ?? 1;
}

export function renderCanonicalPostHtml(
  req: Request,
  appHtmlTemplate: string,
  post: CanonicalPostPage,
  configuredSiteOrigin: string,
): string {
  const meta = getCanonicalPostMeta(req, post, configuredSiteOrigin);
  const socialImage = socialImageFor(post);
  let html = renderAppHtml(req, appHtmlTemplate, configuredSiteOrigin, meta, 'article');
  if (socialImage) {
    html = upsertMeta(html, 'property', 'og:image:secure_url', meta.socialImage);
    html = upsertMeta(html, 'property', 'og:image:type', socialImage.mimeType);
    html = upsertMeta(html, 'property', 'og:image:width', String(socialImage.width));
    html = upsertMeta(html, 'property', 'og:image:height', String(socialImage.height));
  }
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

  const images = post.media.map((item) => new URL(item.urls.large, meta.url).toString());
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
    `<figure><a href="${escapeHtml(item.urls.large)}">`
      + `<img src="${escapeHtml(item.urls.large)}" alt="${escapeHtml(item.altText)}" loading="eager" />`
      + '</a>'
      + (item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : '')
      + '</figure>'
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
