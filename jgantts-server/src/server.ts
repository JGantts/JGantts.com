import type { Server } from 'node:http';
import { createApp } from './app';
import { getRuntimeConfig } from './config';
import { CommentCacheRepository } from './comments/comment-cache-repository';
import { MastodonCommentsService } from './comments/mastodon-comments-service';
import { openContentDatabase } from './db/database';
import { MediaRepository } from './media/media-repository';
import { MediaService } from './media/media-service';
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
    )
    : null;
  const mastodonComments = new MastodonCommentsService(
    new CommentCacheRepository(contentDatabase),
    syndicationRepository,
    mastodonClient,
  );

  if (!appHtmlTemplate) {
    console.warn(`Built app HTML not found at ${SITE_INDEX_PATH}; serving maintenance page with status 503.`);
  }
  if (process.env.NODE_ENV === 'production' && !config.siteOrigin) {
    console.warn('SITE_ORIGIN is not set in production; falling back to request-derived URLs.');
  }
  if (!mastodonSyndication.enabled) {
    console.warn('Mastodon syndication is disabled; set SITE_ORIGIN, MASTODON_BASE_URL, and MASTODON_ACCESS_TOKEN to enable it.');
  }

  const server = createApp({
    adminToken: config.adminApiToken,
    appHtmlTemplate,
    services: {
      mastodonComments,
      mastodonSyndication,
      media: mediaService,
      posts: postService,
    },
    siteOrigin: config.siteOrigin,
  }).listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port}`);
    outboxWorker?.start();
  });
  server.once('close', () => {
    if (outboxWorker) void outboxWorker.stop().finally(() => contentDatabase.close());
    else contentDatabase.close();
  });

  const shutdown = (signal: NodeJS.Signals) => {
    console.log(`${signal} received; closing HTTP server.`);
    server.close((error) => {
      if (error) {
        console.error('Failed to close HTTP server cleanly:', error);
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
