const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const jgantts_com_Path = path.join(__dirname, '../jgantts-com');
const jgantts_conlangiii_Path = path.join(__dirname, '../conlangiii');
const jgantts_com_Dist_Path = path.join(jgantts_com_Path, 'dist');
const jgantts_com_Public_Path = path.join(jgantts_com_Path, 'PUBLIC');
const jgantts_com_Index_Path = path.join(jgantts_com_Dist_Path, 'index.html');
const jgantts_com_Dev_Index_Path = path.join(jgantts_com_Path, 'index.html');
const holmesSocialPreviewPath = path.join(
  jgantts_com_Path,
  'src',
  'assets',
  'holmes-social-preview.svg',
);

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

function upsertTag(html, tagName, matcher, replacement) {
  if (matcher.test(html)) {
    return html.replace(matcher, replacement);
  }

  return html.replace(`</head>`, `  ${replacement}\n  </head>`);
}

function upsertMetaTag(html, attribute, key, content) {
  const escapedContent = escapeHtml(content);
  const matcher = new RegExp(`<meta\\s+${attribute}="${key}"[^>]*>`, 'i');
  const replacement = `<meta ${attribute}="${key}" content="${escapedContent}" />`;

  return upsertTag(html, 'meta', matcher, replacement);
}

function upsertTitleTag(html, title) {
  const escapedTitle = escapeHtml(title);
  const matcher = /<title>.*?<\/title>/i;
  const replacement = `<title>${escapedTitle}</title>`;

  return upsertTag(html, 'title', matcher, replacement);
}

function getBaseUrl(req) {
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

function readAppHtml() {
  if (fs.existsSync(jgantts_com_Index_Path)) {
    return fs.readFileSync(jgantts_com_Index_Path, 'utf8');
  }

  return fs.readFileSync(jgantts_com_Dev_Index_Path, 'utf8');
}

function renderAppHtml(req) {
  const pageMeta = getPageMeta(req);
  let html = readAppHtml();

  html = upsertTitleTag(html, pageMeta.title);
  html = upsertMetaTag(html, 'name', 'description', pageMeta.description);
  html = upsertMetaTag(html, 'property', 'og:url', pageMeta.url);
  html = upsertMetaTag(html, 'property', 'og:type', 'website');
  html = upsertMetaTag(html, 'property', 'og:title', pageMeta.socialTitle);
  html = upsertMetaTag(html, 'property', 'og:description', pageMeta.socialDescription);
  html = upsertMetaTag(html, 'property', 'og:image', pageMeta.socialImage);
  html = upsertMetaTag(html, 'property', 'og:site_name', 'JGantts.com');
  html = upsertMetaTag(html, 'property', 'og:locale', 'en_US');
  html = upsertMetaTag(
    html,
    'name',
    'twitter:card',
    pageMeta.socialImage ? 'summary_large_image' : 'summary',
  );
  html = upsertMetaTag(html, 'name', 'twitter:title', pageMeta.socialTitle);
  html = upsertMetaTag(html, 'name', 'twitter:description', pageMeta.socialDescription);
  html = upsertMetaTag(html, 'name', 'twitter:image', pageMeta.socialImage);

  return html;
}

app.use('/conlangiii/assets', express.static(path.join(jgantts_conlangiii_Path, 'dist', 'assets')));
app.use('/conlangiii/', express.static(path.join(jgantts_conlangiii_Path, 'dist')));
app.get('/conlangiii*', (req, res) => {
  res.sendFile(path.join(jgantts_conlangiii_Path, 'dist', 'index.html'));
});

// Serve static files from the dist directory
app.use('/assets', express.static(path.join(jgantts_com_Dist_Path, 'assets')));
app.use(express.static(jgantts_com_Public_Path));
app.get('/holmes-social-preview.svg', (req, res) => {
  res.sendFile(holmesSocialPreviewPath);
});


// Serve the index.html file for any other route
app.get('*', (req, res) => {
  res.type('html').send(renderAppHtml(req));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
