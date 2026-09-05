import type { Server } from 'node:http';
import { createApp } from './app';
import { getRuntimeConfig } from './config';
import { CommentCacheRepository } from './comments/comment-cache-repository';
import { MastodonCommentsService } from './comments/mastodon-comments-service';
import { openContentDatabase } from './db/database';
import { MediaRepository } from './media/media-repository';
import { MediaService } from './media/media-service';
import { HealthService } from './observability/health-service';
import { createStructuredLogger } from './observability/logger';
import { SITE_INDEX_PATH } from './paths';
import { PostRepository } from './posts/post-repository';
import { PostService } from './posts/post-service';
import { readAppHtml } from './site/html';
import { ensureMediaDirectories } from './storage';
import { MastodonClient } from './syndication/mastodon-client';
import { MastodonSyndicationService } from './syndication/mastodon-syndication-service';
import { OutboxWorker } from './syndication/outbox-worker';
import { SyndicationRepository } from './syndication/syndication-repository';

export function startServer(): Server {
  const logger = createStructuredLogger();
  const config = getRuntimeConfig();
  const appHtmlTemplate = readAppHtml(SITE_INDEX_PATH);
  ensureMediaDirectories(config.mediaRoot);
  const contentDatabase = openContentDatabase(config.databasePath);
  const postRepository = new PostRepository(contentDatabase);
  const postService = new PostService(postRepository);
  const mediaService = new MediaService(
    new MediaRepository(contentDatabase),
    postRepository,
    config.mediaRoot,
  );
  const syndicationRepository = new SyndicationRepository(contentDatabase);
  const mastodonClient = config.mastodonOrigin && config.mastodonAccessToken
    ? new MastodonClient(config.mastodonOrigin, config.mastodonAccessToken)
    : null;
  const mastodonSyndication = new MastodonSyndicationService(
    syndicationRepository,
    postService,
    config.siteOrigin,
    config.mastodonOrigin,
    Boolean(config.mastodonAccessToken),
  );
  const outboxWorker = mastodonSyndication.enabled
    ? new OutboxWorker(
      syndicationRepository,
      mastodonClient as MastodonClient,
      5_000,
      logger,
    )
    : null;
  const mastodonComments = new MastodonCommentsService(
    new CommentCacheRepository(contentDatabase),
    syndicationRepository,
    mastodonClient,
    logger,
  );
  const health = new HealthService(
    contentDatabase,
    config.mediaRoot,
    mastodonSyndication.enabled,
  );

  if (!appHtmlTemplate) {
    logger.warn('frontend_build_missing', { indexPath: SITE_INDEX_PATH });
  }
  if (process.env.NODE_ENV === 'production' && !config.siteOrigin) {
    logger.warn('site_origin_missing');
  }
  if (!mastodonSyndication.enabled) {
    logger.warn('mastodon_syndication_disabled');
  }

  const server = createApp({
    adminToken: config.adminApiToken,
    appHtmlTemplate,
    logger,
    services: {
      health,
      mastodonComments,
      mastodonSyndication,
      media: mediaService,
      posts: postService,
    },
    siteOrigin: config.siteOrigin,
  }).listen(config.port, () => {
    logger.info('server_started', { port: config.port });
    outboxWorker?.start();
  });
  server.once('close', () => {
    if (outboxWorker) void outboxWorker.stop().finally(() => contentDatabase.close());
    else contentDatabase.close();
  });

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info('server_shutdown_started', { signal });
    server.close((error) => {
      if (error) {
        logger.error('server_shutdown_failed', { error });
        process.exitCode = 1;
      }
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return server;
}

if (require.main === module) {
  startServer();
}
