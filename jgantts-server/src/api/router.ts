import express from 'express';
import type { BuildInfo } from '../build-info';
import type { MastodonCommentsService } from '../comments/mastodon-comments-service';
import type { MediaService } from '../media/media-service';
import { ADMIN_SESSION_COOKIE, adminTokenMatches, createAdminAuth } from '../middleware/admin-auth';
import type { HealthService } from '../observability/health-service';
import type { PostService } from '../posts/post-service';
import type { MastodonSyndicationService } from '../syndication/mastodon-syndication-service';
import type { FacebookSyndicationService } from '../syndication/facebook-syndication-service';
import type { FacebookClientLike } from '../syndication/facebook-client';
import { createAdminMediaRouter } from './admin-media';
import { createAdminPostsRouter } from './admin-posts';
import { resolvePostPreview } from '../site/post-preview';
import { revisionedPostPath } from '../site/revision-url';

export type BuildInfoProvider = () => BuildInfo;

export interface ApiServices {
  health?: HealthService;
  mastodonComments?: MastodonCommentsService;
  media?: MediaService;
  mastodonSyndication?: MastodonSyndicationService;
  facebookSyndication?: FacebookSyndicationService;
  facebookClient?: FacebookClientLike;
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
    const postService = services.posts;
    router.use(
      '/admin/posts',
      createAdminAuth(options.adminToken ?? ''),
      createAdminPostsRouter(services.posts, services.media, services.mastodonSyndication, services.facebookSyndication, services.facebookClient),
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
          items: page.items.map((post) => {
            const media = services.media?.listForPost(post.id) ?? [];
            const preview = resolvePostPreview(post, media).token;
            const revision = services.posts?.currentRevision(post.id) ?? 1;
            const versioned = services.posts?.hasMultiplePublishedRevisions(post.id) ?? false;
            return {
              ...post,
              canonicalUrl: revisionedPostPath(post.slug, revision, versioned),
              preview,
              shareUrl: revisionedPostPath(post.slug, revision, versioned, preview),
              ...(versioned ? { revision } : {}),
              media,
            };
          }),
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
      const media = services.media?.listForPost(post.id) ?? [];
      const preview = resolvePostPreview(post, media).token;
      const revision = postService.currentRevision(post.id);
      const versioned = postService.hasMultiplePublishedRevisions(post.id);
      res.set({
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
        'Content-Location': `/api/posts/${encodeURIComponent(post.slug)}`,
      }).json({
        ...post,
        canonicalUrl: revisionedPostPath(post.slug, revision, versioned),
        preview,
        shareUrl: revisionedPostPath(post.slug, revision, versioned, preview),
        ...(versioned ? { revision } : {}),
        media,
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
