import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

export const ADMIN_SESSION_COOKIE = 'jgantts_admin';

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function adminTokenMatches(configuredToken: string, suppliedToken: string): boolean {
  return Boolean(configuredToken && suppliedToken)
    && timingSafeEqual(digest(configuredToken), digest(suppliedToken));
}

function cookieToken(cookieHeader: string | undefined): string {
  if (!cookieHeader) return '';
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1 || part.slice(0, separator).trim() !== ADMIN_SESSION_COOKIE) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return '';
    }
  }
  return '';
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
    const bearerToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : '';
    const suppliedToken = bearerToken || cookieToken(req.get('cookie'));
    if (!suppliedToken || !timingSafeEqual(expectedDigest, digest(suppliedToken))) {
      res.set('WWW-Authenticate', 'Bearer').status(401).json({
        error: { code: 'unauthorized', message: 'A valid admin bearer token is required.' },
      });
      return;
    }
    next();
  };
}
