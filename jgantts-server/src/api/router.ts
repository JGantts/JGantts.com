import express from 'express';
import type { BuildInfo } from '../build-info';

export type BuildInfoProvider = () => BuildInfo;

export function createApiRouter(getBuildInfo: BuildInfoProvider): express.Router {
  const router = express.Router();

  router.use(express.json({ limit: '1mb' }));

  // Operational endpoint. Add future business endpoints in this router.
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/build', (_req, res) => {
    res.set('Cache-Control', 'no-store').json(getBuildInfo());
  });

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
