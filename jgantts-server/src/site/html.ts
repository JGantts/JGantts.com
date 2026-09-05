import fs from 'node:fs';
import type { Request } from 'express';
import { getPageMeta, type ResolvedPageMeta } from './metadata';

const MAINTENANCE_MESSAGE = 'sorry, Jacob is doing his best. contact@JGantts.com';

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Temporarily Unavailable</title>
    <meta name="robots" content="noindex,nofollow" />
  </head>
  <body>
    <main>${escapeHtml(MAINTENANCE_MESSAGE)}</main>
  </body>
</html>`;

function replaceTokens(html: string, replacements: Record<string, string>): string {
  let renderedHtml = html;
  for (const [token, value] of Object.entries(replacements)) {
    renderedHtml = renderedHtml.replaceAll(token, escapeHtml(value));
  }
  return renderedHtml;
}

function tagHasAttribute(tag: string, attribute: string, expectedValue: string): boolean {
  const attributePattern = new RegExp(
    `\\s${attribute}\\s*=\\s*(?:"${expectedValue}"|'${expectedValue}'|${expectedValue}(?=\\s|/?>))`,
    'i',
  );
  return attributePattern.test(tag);
}

function insertBeforeHeadClose(html: string, tag: string): string {
  if (!/<\/head\s*>/i.test(html)) {
    throw new Error('Built app HTML is missing a closing </head> tag.');
  }
  return html.replace(/<\/head\s*>/i, `  ${tag}\n  </head>`);
}

function upsertTitle(html: string, title: string): string {
  const tag = `<title>${escapeHtml(title)}</title>`;
  return /<title\b[^>]*>[\s\S]*?<\/title\s*>/i.test(html)
    ? html.replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/i, tag)
    : insertBeforeHeadClose(html, tag);
}

export function upsertMeta(
  html: string,
  attribute: 'name' | 'property',
  key: string,
  value: string,
): string {
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
  const metaTagPattern = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = metaTagPattern.exec(html)) !== null) {
    if (tagHasAttribute(match[0], attribute, key)) {
      return `${html.slice(0, match.index)}${tag}${html.slice(match.index + match[0].length)}`;
    }
  }

  return insertBeforeHeadClose(html, tag);
}

export function renderAppHtml(
  req: Request,
  appHtmlTemplate: string,
  configuredSiteOrigin = '',
  pageMetaOverride?: ResolvedPageMeta,
  ogType = 'website',
): string {
  const pageMeta = pageMetaOverride ?? getPageMeta(req, configuredSiteOrigin);
  const twitterCard = pageMeta.socialImage ? 'summary_large_image' : 'summary';
  const replacements = {
    __PAGE_TITLE__: pageMeta.title,
    __PAGE_DESCRIPTION__: pageMeta.description,
    __OG_URL__: pageMeta.url,
    __OG_TYPE__: ogType,
    __OG_TITLE__: pageMeta.socialTitle,
    __OG_DESCRIPTION__: pageMeta.socialDescription,
    __OG_IMAGE__: pageMeta.socialImage,
    __OG_SITE_NAME__: 'JGantts.com',
    __OG_LOCALE__: 'en_US',
    __TWITTER_CARD__: twitterCard,
    __TWITTER_TITLE__: pageMeta.socialTitle,
    __TWITTER_DESCRIPTION__: pageMeta.socialDescription,
    __TWITTER_IMAGE__: pageMeta.socialImage,
  };

  let html = replaceTokens(appHtmlTemplate, replacements);
  html = upsertTitle(html, pageMeta.title);
  html = upsertMeta(html, 'name', 'description', pageMeta.description);
  html = upsertMeta(html, 'property', 'og:url', pageMeta.url);
  html = upsertMeta(html, 'property', 'og:type', ogType);
  html = upsertMeta(html, 'property', 'og:title', pageMeta.socialTitle);
  html = upsertMeta(html, 'property', 'og:description', pageMeta.socialDescription);
  html = upsertMeta(html, 'property', 'og:image', pageMeta.socialImage);
  html = upsertMeta(html, 'property', 'og:site_name', 'JGantts.com');
  html = upsertMeta(html, 'property', 'og:locale', 'en_US');
  html = upsertMeta(html, 'name', 'twitter:card', twitterCard);
  html = upsertMeta(html, 'name', 'twitter:title', pageMeta.socialTitle);
  html = upsertMeta(html, 'name', 'twitter:description', pageMeta.socialDescription);
  html = upsertMeta(html, 'name', 'twitter:image', pageMeta.socialImage);
  return html;
}

export function readAppHtml(indexPath: string): string {
  try {
    return fs.readFileSync(indexPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}
