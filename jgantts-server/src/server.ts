import type { Server } from 'node:http';
import { createApp } from './app';
import { getRuntimeConfig } from './config';
import { SITE_INDEX_PATH } from './paths';
import { readAppHtml } from './site/html';

export function startServer(): Server {
  const config = getRuntimeConfig();
  const appHtmlTemplate = readAppHtml(SITE_INDEX_PATH);

  if (!appHtmlTemplate) {
    console.warn(`Built app HTML not found at ${SITE_INDEX_PATH}; serving maintenance page with status 503.`);
  }
  if (process.env.NODE_ENV === 'production' && !config.siteOrigin) {
    console.warn('SITE_ORIGIN is not set in production; falling back to request-derived URLs.');
  }

  const server = createApp({
    appHtmlTemplate,
    siteOrigin: config.siteOrigin,
  }).listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port}`);
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
