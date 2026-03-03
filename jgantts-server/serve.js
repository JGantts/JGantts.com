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

const requiredTemplateTokens = [
  '__PAGE_TITLE__',
  '__PAGE_DESCRIPTION__',
  '__OG_URL__',
  '__OG_TYPE__',
  '__OG_TITLE__',
  '__OG_DESCRIPTION__',
  '__OG_IMAGE__',
  '__OG_SITE_NAME__',
  '__OG_LOCALE__',
  '__TWITTER_CARD__',
  '__TWITTER_TITLE__',
  '__TWITTER_DESCRIPTION__',
  '__TWITTER_IMAGE__',
];

for (const token of requiredTemplateTokens) {
  if (!appHtmlTemplate.includes(token)) {
    throw new Error(
      `Missing required metadata token ${token} in ${jgantts_com_Index_Path}. Rebuild jgantts-com with the updated HTML template.`,
    );
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
  const replacements = {
    __PAGE_TITLE__: pageMeta.title,
    __PAGE_DESCRIPTION__: pageMeta.description,
    __OG_URL__: pageMeta.url,
    __OG_TYPE__: 'website',
    __OG_TITLE__: pageMeta.socialTitle,
    __OG_DESCRIPTION__: pageMeta.socialDescription,
    __OG_IMAGE__: pageMeta.socialImage,
    __OG_SITE_NAME__: 'JGantts.com',
    __OG_LOCALE__: 'en_US',
    __TWITTER_CARD__: pageMeta.socialImage ? 'summary_large_image' : 'summary',
    __TWITTER_TITLE__: pageMeta.socialTitle,
    __TWITTER_DESCRIPTION__: pageMeta.socialDescription,
    __TWITTER_IMAGE__: pageMeta.socialImage,
  };

  let html = appHtmlTemplate;

  for (const [token, value] of Object.entries(replacements)) {
    html = html.replaceAll(token, escapeHtml(value));
  }

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
