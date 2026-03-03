const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const jgantts_com_Path = path.join(__dirname, '../jgantts-com');
const jgantts_com_Dist_Path = path.join(jgantts_com_Path, 'dist');
const jgantts_com_Public_Path = path.join(jgantts_com_Path, 'PUBLIC');
const jgantts_com_Index_Path = path.join(jgantts_com_Dist_Path, 'index.html');
const configuredSiteOrigin = process.env.SITE_ORIGIN
  ? process.env.SITE_ORIGIN.replace(/\/+$/, '')
  : '';

if (!fs.existsSync(jgantts_com_Index_Path)) {
  throw new Error(
    `Missing built app HTML at ${jgantts_com_Index_Path}. Build jgantts-com before starting the server.`,
  );
}

if (process.env.NODE_ENV === 'production' && !configuredSiteOrigin) {
  throw new Error('SITE_ORIGIN must be set in production so canonical social URLs are stable.');
}

const appHtmlTemplate = fs.readFileSync(jgantts_com_Index_Path, 'utf8');

const defaultPageMeta = {
  title: 'JGantts.com',
  description: 'JGantts',
  socialTitle: 'JGantts',
  socialDescription: 'JGantts',
  socialImage: '/social-media.png',
};

const holmesPageMeta = {
  title: 'Holmes, Zachary',
  description:
    'Professional tour guide at Desert Adventures. Find Zachary Holmes on social, maps, and tip links.',
  socialTitle: 'Holmes, Zachary | Desert Adventures',
  socialDescription:
    'Professional tour guide. Follow Zachary Holmes, get directions, and find tip links in one place.',
  socialImage: '/holmes-social-preview.svg',
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function replaceTokenIfPresent(html, token, value) {
  if (!html.includes(token)) {
    return html;
  }

  return html.replaceAll(token, escapeHtml(value));
}

function replaceTitleTag(html, title) {
  return html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
}

function replaceMetaContent(html, attribute, key, value) {
  const escapedValue = escapeHtml(value);
  const matcher = new RegExp(`(<meta\\s+${attribute}="${key}"[^>]*content=")([^"]*)(".*?>)`, 'i');

  if (matcher.test(html)) {
    return html.replace(matcher, `$1${escapedValue}$3`);
  }

  const tag = `<meta ${attribute}="${key}" content="${escapedValue}" />`;

  return html.replace('</head>', `  ${tag}\n  </head>`);
}

function getBaseUrl(req) {
  if (configuredSiteOrigin) {
    return configuredSiteOrigin;
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0] : req.protocol;

  return `${protocol}://${req.get('host')}`;
}

function getPageMeta(req) {
  const pageMeta = req.path === '/holmes' || req.path.startsWith('/holmes/')
    ? holmesPageMeta
    : defaultPageMeta;

  const baseUrl = getBaseUrl(req);
  const canonicalPath = req.originalUrl || req.path || '/';

  return {
    ...pageMeta,
    url: new URL(canonicalPath, `${baseUrl}/`).toString(),
    socialImage: new URL(pageMeta.socialImage, `${baseUrl}/`).toString(),
  };
}

function renderAppHtml(req) {
  const pageMeta = getPageMeta(req);
  let html = appHtmlTemplate;
  const twitterCard = pageMeta.socialImage ? 'summary_large_image' : 'summary';

  html = replaceTokenIfPresent(html, '__PAGE_TITLE__', pageMeta.title);
  html = replaceTokenIfPresent(html, '__PAGE_DESCRIPTION__', pageMeta.description);
  html = replaceTokenIfPresent(html, '__OG_URL__', pageMeta.url);
  html = replaceTokenIfPresent(html, '__OG_TYPE__', 'website');
  html = replaceTokenIfPresent(html, '__OG_TITLE__', pageMeta.socialTitle);
  html = replaceTokenIfPresent(html, '__OG_DESCRIPTION__', pageMeta.socialDescription);
  html = replaceTokenIfPresent(html, '__OG_IMAGE__', pageMeta.socialImage);
  html = replaceTokenIfPresent(html, '__OG_SITE_NAME__', 'JGantts.com');
  html = replaceTokenIfPresent(html, '__OG_LOCALE__', 'en_US');
  html = replaceTokenIfPresent(html, '__TWITTER_CARD__', twitterCard);
  html = replaceTokenIfPresent(html, '__TWITTER_TITLE__', pageMeta.socialTitle);
  html = replaceTokenIfPresent(html, '__TWITTER_DESCRIPTION__', pageMeta.socialDescription);
  html = replaceTokenIfPresent(html, '__TWITTER_IMAGE__', pageMeta.socialImage);

  html = replaceTitleTag(html, pageMeta.title);
  html = replaceMetaContent(html, 'name', 'description', pageMeta.description);
  html = replaceMetaContent(html, 'property', 'og:url', pageMeta.url);
  html = replaceMetaContent(html, 'property', 'og:type', 'website');
  html = replaceMetaContent(html, 'property', 'og:title', pageMeta.socialTitle);
  html = replaceMetaContent(html, 'property', 'og:description', pageMeta.socialDescription);
  html = replaceMetaContent(html, 'property', 'og:image', pageMeta.socialImage);
  html = replaceMetaContent(html, 'property', 'og:site_name', 'JGantts.com');
  html = replaceMetaContent(html, 'property', 'og:locale', 'en_US');
  html = replaceMetaContent(html, 'name', 'twitter:card', twitterCard);
  html = replaceMetaContent(html, 'name', 'twitter:title', pageMeta.socialTitle);
  html = replaceMetaContent(html, 'name', 'twitter:description', pageMeta.socialDescription);
  html = replaceMetaContent(html, 'name', 'twitter:image', pageMeta.socialImage);

  return html;
}

// Serve static files from the dist directory
app.use('/assets', express.static(path.join(jgantts_com_Dist_Path, 'assets')));
app.use(express.static(jgantts_com_Public_Path));

// Serve the index.html file for any other route
app.get('*', (req, res) => {
  if (path.extname(req.path)) {
    res.sendStatus(404);
    return;
  }

  res.type('html').send(renderAppHtml(req));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
