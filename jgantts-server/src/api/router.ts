import express from 'express';
import type { BuildInfo } from '../build-info';
import type { MastodonCommentsService } from '../comments/mastodon-comments-service';
import type { MediaService } from '../media/media-service';
import { ADMIN_SESSION_COOKIE, adminTokenMatches, createAdminAuth } from '../middleware/admin-auth';
import type { HealthService } from '../observability/health-service';
import type { PostService } from '../posts/post-service';
import type { MastodonSyndicationService } from '../syndication/mastodon-syndication-service';
import { createAdminMediaRouter } from './admin-media';
import { createAdminPostsRouter } from './admin-posts';

export type BuildInfoProvider = () => BuildInfo;

export interface ApiServices {
  health?: HealthService;
  mastodonComments?: MastodonCommentsService;
  media?: MediaService;
  mastodonSyndication?: MastodonSyndicationService;
  posts?: PostService;
}

export interface ApiOptions {
  adminToken?: string;
}

function badRequest(message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status: 400 });
}

export function createApiRouter(
  getBuildInfo: BuildInfoProvider,
  services: ApiServices = {},
  options: ApiOptions = {},
): express.Router {
  const router = express.Router();

  router.use(express.json({ limit: '1mb' }));

  // Operational endpoint. Add future business endpoints in this router.
  router.get('/health', (_req, res) => {
    const report = services.health?.inspect() ?? { status: 'ok' };
    res.set('Cache-Control', 'no-store').status(report.status === 'unhealthy' ? 503 : 200).json(report);
  });

  router.get('/build', (_req, res) => {
    res.set('Cache-Control', 'no-store').json(getBuildInfo());
  });

  router.post('/admin/session', (req, res) => {
    const configuredToken = options.adminToken ?? '';
    if (!configuredToken) {
      res.status(503).json({
        error: { code: 'admin_unavailable', message: 'The admin API is not configured.' },
      });
      return;
    }
    const suppliedToken = typeof req.body?.token === 'string' ? req.body.token : '';
    if (!adminTokenMatches(configuredToken, suppliedToken)) {
      res.status(401).json({
        error: { code: 'unauthorized', message: 'That admin token was not accepted.' },
      });
      return;
    }
    res.cookie(ADMIN_SESSION_COOKIE, configuredToken, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: '/api/admin',
      sameSite: 'strict',
      secure: true,
    }).set('Cache-Control', 'no-store').status(204).end();
  });

  router.delete('/admin/session', (_req, res) => {
    res.clearCookie(ADMIN_SESSION_COOKIE, {
      httpOnly: true,
      path: '/api/admin',
      sameSite: 'strict',
      secure: true,
    }).set('Cache-Control', 'no-store').status(204).end();
  });

  if (services.posts) {
    router.use(
      '/admin/posts',
      createAdminAuth(options.adminToken ?? ''),
      createAdminPostsRouter(services.posts, services.media, services.mastodonSyndication),
    );

    router.get('/posts', (req, res, next) => {
      try {
        const rawLimit = req.query.limit;
        if (Array.isArray(rawLimit) || (rawLimit !== undefined && typeof rawLimit !== 'string')) {
          throw badRequest('Post page limit must be a single integer.');
        }
        const limit = rawLimit === undefined ? undefined : Number(rawLimit);
        const rawCursor = req.query.cursor;
        if (Array.isArray(rawCursor) || (rawCursor !== undefined && typeof rawCursor !== 'string')) {
          throw badRequest('Post cursor must be a single string.');
        }
        const page = services.posts?.listPublished({ cursor: rawCursor, limit });
        res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120').json(page && {
          ...page,
          items: page.items.map((post) => ({
            ...post,
            media: services.media?.listForPost(post.id) ?? [],
          })),
        });
      } catch (error) {
        if (error instanceof RangeError || error instanceof TypeError) {
          next(badRequest(error.message));
          return;
        }
        next(error);
      }
    });

    if (services.mastodonComments) {
      router.get('/posts/:slug/comments/mastodon', async (req, res, next) => {
        try {
          const post = services.posts?.findBySlug(req.params.slug);
          if (!post) {
            res.status(404).json({
              error: { code: 'not_found', message: 'No published post exists at this slug.' },
            });
            return;
          }
          const result = await services.mastodonComments?.getForPost(post.id);
          res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120').json(result);
        } catch (error) {
          next(error);
        }
      });
    }

    router.get('/posts/:slug', (req, res) => {
      const post = services.posts?.findBySlug(req.params.slug);
      if (!post) {
        res.status(404).json({
          error: { code: 'not_found', message: 'No published post exists at this slug.' },
        });
        return;
      }
      res.set({
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
        'Content-Location': `/api/posts/${encodeURIComponent(post.slug)}`,
      }).json({
        ...post,
        media: services.media?.listForPost(post.id) ?? [],
      });
    });
  }

  if (services.media) {
    router.use('/admin/media', createAdminAuth(options.adminToken ?? ''), createAdminMediaRouter(services.media));
  }

  router.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'not_found',
        message: `No API route exists for ${req.method} ${req.originalUrl}`,
      },
    });
  });

  return router;
}
