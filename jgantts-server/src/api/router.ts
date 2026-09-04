import express from 'express';

export function createApiRouter(): express.Router {
  const router = express.Router();

  router.use(express.json({ limit: '1mb' }));

  // Operational endpoint. Add future business endpoints in this router.
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
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
