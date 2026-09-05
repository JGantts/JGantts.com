import path from 'node:path';
import express from 'express';
import { createMediaRouter } from './api/media';
import { createApiRouter, type ApiServices, type BuildInfoProvider } from './api/router';
import { loadBuildInfo, type BuildInfo } from './build-info';
import { normalizeSiteOrigin } from './config';
import { errorHandler } from './middleware/error-handler';
import { SITE_DIST_ROOT, SITE_INDEX_PATH, SITE_PUBLIC_ROOT } from './paths';
import { MAINTENANCE_HTML, readAppHtml, renderAppHtml } from './site/html';
import { renderAtomFeed, renderSitemap } from './site/discovery';
import { renderCanonicalPostHtml } from './site/post-page';

export interface AppOptions {
  adminToken?: string;
  appHtmlTemplate?: string;
  buildInfo?: BuildInfo;
  buildInfoProvider?: BuildInfoProvider;
  distRoot?: string;
  indexPath?: string;
  publicRoot?: string;
  services?: ApiServices;
  siteOrigin?: string;
}

export function createApp(options: AppOptions = {}): express.Express {
  const app = express();
  const configuredSiteOrigin = normalizeSiteOrigin(
    options.siteOrigin === undefined ? process.env.SITE_ORIGIN : options.siteOrigin,
  );
  const appHtmlTemplate = options.appHtmlTemplate === undefined
    ? readAppHtml(options.indexPath ?? SITE_INDEX_PATH)
    : options.appHtmlTemplate;
  const distRoot = options.distRoot ?? SITE_DIST_ROOT;
  const publicRoot = options.publicRoot ?? SITE_PUBLIC_ROOT;
  const fixedBuildInfo = options.buildInfo;
  const getBuildInfo = options.buildInfoProvider
    ?? (fixedBuildInfo ? () => fixedBuildInfo : () => loadBuildInfo());

  app.disable('x-powered-by');

  // API routes must be mounted before the SPA fallback.
  app.use('/api', createApiRouter(getBuildInfo, options.services, {
    adminToken: options.adminToken,
  }));
  if (options.services?.media) app.use('/media', createMediaRouter(options.services.media));

  const postsService = options.services?.posts;
  if (postsService) {
    app.get('/feed.xml', (req, res) => {
      res.type('application/atom+xml').set('Cache-Control', 'public, max-age=300')
        .send(renderAtomFeed(
          req,
          postsService,
          options.services?.media,
          configuredSiteOrigin,
        ));
    });
    app.get('/sitemap.xml', (req, res) => {
      res.type('application/xml').set('Cache-Control', 'public, max-age=300')
        .send(renderSitemap(
          req,
          postsService,
          configuredSiteOrigin,
        ));
    });
  }

  app.use('/assets', express.static(path.join(distRoot, 'assets'), {
    fallthrough: true,
    immutable: process.env.NODE_ENV === 'production',
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  }));
  app.use(express.static(publicRoot, { index: false }));

  app.get('/posts/:slug', (req, res, next) => {
    try {
      if (!appHtmlTemplate) {
        res.status(503).type('html').set('Cache-Control', 'no-store').send(MAINTENANCE_HTML);
        return;
      }
      const post = options.services?.posts?.findAnyBySlug(req.params.slug);
      if (!post || post.status === 'draft') {
        res.status(404).type('html').set('Cache-Control', 'no-store')
          .send(renderAppHtml(req, appHtmlTemplate, configuredSiteOrigin));
        return;
      }
      if (post.status === 'archived') {
        res.status(410).type('html').set('Cache-Control', 'no-store')
          .send(renderAppHtml(req, appHtmlTemplate, configuredSiteOrigin));
        return;
      }
      if (post.slug !== req.params.slug) {
        res.redirect(308, `/posts/${encodeURIComponent(post.slug)}`);
        return;
      }
      const page = {
        ...post,
        media: options.services?.media?.listForPost(post.id) ?? [],
      };
      res.status(200).type('html').set('Cache-Control', 'no-cache')
        .send(renderCanonicalPostHtml(req, appHtmlTemplate, page, configuredSiteOrigin));
    } catch (error) {
      next(error);
    }
  });

  app.get(/.*/, (req, res) => {
    if (path.posix.extname(req.path)) {
      res.sendStatus(404);
      return;
    }

    if (!appHtmlTemplate) {
      res.status(503).type('html').set('Cache-Control', 'no-store').send(MAINTENANCE_HTML);
      return;
    }

    const html = renderAppHtml(req, appHtmlTemplate, configuredSiteOrigin);
    res.type('html').set('Cache-Control', 'no-cache').send(html);
  });

  app.use(errorHandler);
  return app;
}
