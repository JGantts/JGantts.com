import type { ErrorRequestHandler } from 'express';
import { MAINTENANCE_HTML } from '../site/html';

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const candidateStatus = Number((error as { status?: unknown }).status);
  const status = candidateStatus >= 400 && candidateStatus <= 599 ? candidateStatus : 500;

  if (status >= 500) {
    console.error('Request failed:', error);
  }

  if (req.path === '/api' || req.path.startsWith('/api/')) {
    res.status(status).json({
      error: {
        code: status < 500 ? 'bad_request' : 'internal_error',
        message: status < 500
          ? 'The API request is invalid.'
          : 'The server could not complete the request.',
      },
    });
    return;
  }

  res.status(503).type('html').set('Cache-Control', 'no-store').send(MAINTENANCE_HTML);
};
