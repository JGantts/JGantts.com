import type { ErrorRequestHandler } from 'express';
import type { StructuredLogger } from '../observability/logger';
import { NOOP_LOGGER } from '../observability/logger';
import { MAINTENANCE_HTML } from '../site/html';

export function createErrorHandler(logger: StructuredLogger = NOOP_LOGGER): ErrorRequestHandler {
  return (error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const candidateStatus = Number((error as { status?: unknown }).status);
    const status = candidateStatus >= 400 && candidateStatus <= 599 ? candidateStatus : 500;
    const publicMessage = status < 500
      && (error as { expose?: unknown }).expose === true
      && error instanceof Error
      && error.message
      ? error.message
      : status < 500
        ? 'The API request is invalid.'
        : 'The server could not complete the request.';

    if (status >= 500) {
      logger.error('http_request_failed', {
        error,
        method: req.method,
        path: req.path,
        status,
      });
    } else {
      logger.warn('http_request_rejected', {
        message: publicMessage,
        method: req.method,
        path: req.path,
        status,
      });
    }

    if (req.path === '/api' || req.path.startsWith('/api/')) {
      res.status(status).json({
        error: {
          code: status < 500 ? 'bad_request' : 'internal_error',
          message: publicMessage,
        },
      });
      return;
    }

    res.status(503).type('html').set('Cache-Control', 'no-store').send(MAINTENANCE_HTML);
  };
}

export const errorHandler = createErrorHandler();
