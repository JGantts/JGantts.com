import type { Request } from 'express';

export interface PageMeta {
  title: string;
  description: string;
  socialTitle: string;
  socialDescription: string;
  socialImage: string;
}

export interface ResolvedPageMeta extends PageMeta {
  url: string;
}

const DEFAULT_PAGE_META: PageMeta = {
  title: 'JGantts.com',
  description: 'JGantts',
  socialTitle: 'JGantts',
  socialDescription: 'JGantts',
  socialImage: '/social-media.png',
};

const ROUTE_META: ReadonlyArray<{ prefix: string; meta: PageMeta }> = [
  {
    prefix: '/holmes',
    meta: {
      title: 'Holmes, Zachary',
      description:
        'Professional tour guide at Desert Adventures. Find Zachary Holmes on social, maps, and tip links.',
      socialTitle: 'Holmes, Zachary | Desert Adventures',
      socialDescription:
        'Professional tour guide. Follow Zachary Holmes, get directions, and find tip links in one place.',
      socialImage: '/holmes-social-preview.svg',
    },
  },
  {
    prefix: '/kovyalo',
    meta: {
      title: 'Kovyálo',
      description: 'Years ago, a ship landed. We are their children.',
      socialTitle: 'Kovyálo | JGantts',
      socialDescription: "JGantts' Conworld of Kovyálo.",
      socialImage: '/social-media.png',
    },
  },
  {
    prefix: '/photos',
    meta: {
      title: 'JGantts Photos',
      description: 'Photos from JGantts.',
      socialTitle: 'Photos | JGantts',
      socialDescription: 'Photos from JGantts',
      socialImage: '/social-media.png',
    },
  },
  {
    prefix: '/posts',
    meta: {
      title: 'Posts | JGantts',
      description: 'Writing and photographs from Jacob Gantt, published here first.',
      socialTitle: 'Posts | JGantts',
      socialDescription: 'Writing and photographs from Jacob Gantt, published here first.',
      socialImage: '/social-media.png',
    },
  },
];

function firstHeaderValue(value: string | string[] | undefined): string {
  const firstValue = Array.isArray(value) ? value[0] : value;
  return firstValue?.split(',')[0]?.trim() ?? '';
}

export function getRequestOrigin(req: Request, configuredSiteOrigin: string): string {
  if (configuredSiteOrigin) {
    return configuredSiteOrigin;
  }

  const forwardedProtocol = firstHeaderValue(req.headers['x-forwarded-proto']).toLowerCase();
  const protocol = ['http', 'https'].includes(forwardedProtocol)
    ? forwardedProtocol
    : req.protocol === 'https'
      ? 'https'
      : 'http';
  const host = firstHeaderValue(req.headers['x-forwarded-host']) || req.get('host');

  if (!host) {
    throw new Error('The request did not include a Host header.');
  }

  try {
    const parsed = new URL(`${protocol}://${host}`);
    if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new Error();
    }
    return parsed.origin;
  } catch {
    throw new Error('The request included an invalid Host header.');
  }
}

function isRouteOrChild(requestPath: string, prefix: string): boolean {
  return requestPath === prefix || requestPath.startsWith(`${prefix}/`);
}

export function getPageMeta(req: Request, configuredSiteOrigin = ''): ResolvedPageMeta {
  const pageMeta = ROUTE_META.find(({ prefix }) => isRouteOrChild(req.path, prefix))?.meta
    ?? DEFAULT_PAGE_META;
  const origin = getRequestOrigin(req, configuredSiteOrigin);
  const pageUrl = new URL(origin);

  // Keep protocol-relative request targets on our origin and omit tracking parameters.
  pageUrl.pathname = req.path || '/';

  return {
    ...pageMeta,
    url: pageUrl.toString(),
    socialImage: new URL(pageMeta.socialImage, `${origin}/`).toString(),
  };
}
