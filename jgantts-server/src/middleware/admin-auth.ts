import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function createAdminAuth(configuredToken: string): RequestHandler {
  const expectedDigest = configuredToken ? digest(configuredToken) : null;

  return (req, res, next) => {
    if (!expectedDigest) {
      res.status(503).json({
        error: { code: 'admin_unavailable', message: 'The admin API is not configured.' },
      });
      return;
    }
    const authorization = req.get('authorization');
    const suppliedToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : '';
    if (!suppliedToken || !timingSafeEqual(expectedDigest, digest(suppliedToken))) {
      res.set('WWW-Authenticate', 'Bearer').status(401).json({
        error: { code: 'unauthorized', message: 'A valid admin bearer token is required.' },
      });
      return;
    }
    next();
  };
}
