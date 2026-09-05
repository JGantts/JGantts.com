import type { Server } from 'node:http';
import { createApp } from './app';
import { getRuntimeConfig } from './config';
import { openContentDatabase } from './db/database';
import { MediaRepository } from './media/media-repository';
import { MediaService } from './media/media-service';
import { SITE_INDEX_PATH } from './paths';
import { PostRepository } from './posts/post-repository';
import { PostService } from './posts/post-service';
import { readAppHtml } from './site/html';
import { ensureMediaDirectories } from './storage';

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

  if (!appHtmlTemplate) {
    console.warn(`Built app HTML not found at ${SITE_INDEX_PATH}; serving maintenance page with status 503.`);
  }
  if (process.env.NODE_ENV === 'production' && !config.siteOrigin) {
    console.warn('SITE_ORIGIN is not set in production; falling back to request-derived URLs.');
  }

  const server = createApp({
    adminToken: config.adminApiToken,
    appHtmlTemplate,
    services: { media: mediaService, posts: postService },
    siteOrigin: config.siteOrigin,
  }).listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port}`);
  });
  server.once('close', () => contentDatabase.close());

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
