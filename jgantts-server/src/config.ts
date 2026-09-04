export const DEFAULT_PORT = 3000;

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
  port: number;
  siteOrigin: string;
}

export function getRuntimeConfig(environment: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    port: parsePort(environment.PORT),
    siteOrigin: normalizeSiteOrigin(environment.SITE_ORIGIN),
  };
}
