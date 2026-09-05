import type { MastodonStatusContext, MastodonStatusResult } from './types';

const REQUEST_TIMEOUT_MS = 15_000;

export class MastodonRequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
  }

  get permanent(): boolean {
    return this.status !== null && this.status >= 400 && this.status < 500 && this.status !== 408 && this.status !== 429;
  }
}

function retryAfterMilliseconds(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

export interface MastodonClientLike {
  editStatus(statusId: string, text: string, idempotencyKey: string): Promise<MastodonStatusResult>;
  getStatusCharacterLimit(): Promise<number>;
  publishStatus(text: string, idempotencyKey: string): Promise<MastodonStatusResult>;
}

export interface MastodonCommentsClientLike {
  getStatusContext(statusId: string): Promise<MastodonStatusContext>;
}

export class MastodonClient implements MastodonClientLike {
  private statusCharacterLimit: number | null = null;

  constructor(
    private readonly origin: string,
    private readonly accessToken: string,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  async getStatusCharacterLimit(): Promise<number> {
    if (this.statusCharacterLimit !== null) return this.statusCharacterLimit;
    const response = await this.request('/api/v2/instance', { authenticated: false });
    const body = await response.json() as { configuration?: { statuses?: { max_characters?: unknown } } };
    const limit = body.configuration?.statuses?.max_characters;
    if (!Number.isInteger(limit) || Number(limit) < 1) {
      throw new MastodonRequestError('Mastodon did not report a valid status character limit.', response.status);
    }
    this.statusCharacterLimit = Number(limit);
    return this.statusCharacterLimit;
  }

  publishStatus(text: string, idempotencyKey: string): Promise<MastodonStatusResult> {
    return this.writeStatus('/api/v1/statuses', 'POST', text, idempotencyKey);
  }

  editStatus(statusId: string, text: string, idempotencyKey: string): Promise<MastodonStatusResult> {
    return this.writeStatus(`/api/v1/statuses/${encodeURIComponent(statusId)}`, 'PUT', text, idempotencyKey);
  }

  async getStatusContext(statusId: string): Promise<MastodonStatusContext> {
    const response = await this.request(`/api/v1/statuses/${encodeURIComponent(statusId)}/context`);
    const body = await response.json() as Partial<MastodonStatusContext>;
    if (!Array.isArray(body.ancestors) || !Array.isArray(body.descendants)) {
      throw new MastodonRequestError('Mastodon returned an invalid status context.', response.status);
    }
    return { ancestors: body.ancestors, descendants: body.descendants };
  }

  private async writeStatus(
    pathname: string,
    method: 'POST' | 'PUT',
    text: string,
    idempotencyKey: string,
  ): Promise<MastodonStatusResult> {
    const response = await this.request(pathname, {
      body: JSON.stringify({ status: text, visibility: 'public' }),
      headers: {
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey,
      },
      method,
    });
    const body = await response.json() as { id?: unknown; url?: unknown };
    if (typeof body.id !== 'string' || typeof body.url !== 'string') {
      throw new MastodonRequestError('Mastodon returned an invalid status response.', response.status);
    }
    return { id: body.id, url: body.url };
  }

  private async request(
    pathname: string,
    options: RequestInit & { authenticated?: boolean } = {},
  ): Promise<Response> {
    const { authenticated, ...requestOptions } = options;
    const headers = new Headers(options.headers);
    if (authenticated !== false) headers.set('authorization', `Bearer ${this.accessToken}`);
    let response: Response;
    try {
      response = await this.fetchImplementation(`${this.origin}${pathname}`, {
        ...requestOptions,
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new MastodonRequestError(
        error instanceof Error ? `Mastodon request failed: ${error.message}` : 'Mastodon request failed.',
        null,
      );
    }
    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.json() as { error?: unknown };
        if (typeof body.error === 'string') detail = `: ${body.error}`;
      } catch {
        // Error bodies are optional and untrusted.
      }
      throw new MastodonRequestError(
        `Mastodon returned HTTP ${response.status}${detail}`,
        response.status,
        retryAfterMilliseconds(response.headers.get('retry-after')),
      );
    }
    return response;
  }
}
