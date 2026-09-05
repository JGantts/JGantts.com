import path from 'node:path';
import { SERVER_ROOT } from './paths';

export const DEFAULT_PORT = 3000;
export const PRODUCTION_DATA_ROOT = '/var/lib/jgantts';
const DEPLOYMENT_ROOT = path.resolve(SERVER_ROOT, '..');

function resolveDataRoot(value: string | undefined, environment: NodeJS.ProcessEnv): string {
  const configured = value?.trim();
  const defaultRoot = environment.NODE_ENV === 'production'
    ? PRODUCTION_DATA_ROOT
    : path.join(SERVER_ROOT, '.data');
  const resolved = path.resolve(configured || defaultRoot);

  const isInsideDeployment = resolved === DEPLOYMENT_ROOT
    || resolved.startsWith(`${DEPLOYMENT_ROOT}${path.sep}`);
  if (environment.NODE_ENV === 'production' && isInsideDeployment) {
    throw new Error('JGANTTS_DATA_ROOT must be outside the deployed application directory in production.');
  }

  return resolved;
}

export function normalizeSiteOrigin(value: string | undefined): string {
  if (!value?.trim()) {
    return '';
  }

  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error('SITE_ORIGIN must be an absolute http:// or https:// URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('SITE_ORIGIN must use http:// or https://.');
  }

  if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('SITE_ORIGIN must contain only an origin, for example https://jgantts.com.');
  }

  return parsed.origin;
}

export function parsePort(value: string | undefined): number {
  const port = value === undefined || value === '' ? DEFAULT_PORT : Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('PORT must be an integer between 0 and 65535.');
  }
  return port;
}

export interface RuntimeConfig {
  adminApiToken: string;
  dataRoot: string;
  databasePath: string;
  mediaRoot: string;
  port: number;
  siteOrigin: string;
}

export function getRuntimeConfig(environment: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const dataRoot = resolveDataRoot(environment.JGANTTS_DATA_ROOT, environment);
  return {
    adminApiToken: environment.JGANTTS_ADMIN_TOKEN?.trim() ?? '',
    dataRoot,
    databasePath: path.join(dataRoot, 'content.sqlite'),
    mediaRoot: path.join(dataRoot, 'media'),
    port: parsePort(environment.PORT),
    siteOrigin: normalizeSiteOrigin(environment.SITE_ORIGIN),
  };
}
