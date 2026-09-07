export interface FacebookPostResult { id: string; url: string }
export interface FacebookPostCandidate { id: string; url: string; message: string; link: string; createdTime: string }

export class FacebookRequestError extends Error {
  constructor(message: string, readonly permanent = false, readonly uncertain = false, readonly retryAfterMs: number | null = null, readonly meta: { code?: number; subcode?: number; type?: string; transient?: boolean; traceId?: string } = {}) { super(message); }
}

export interface FacebookClientLike { publishLink(message: string, link: string): Promise<FacebookPostResult>; findPagePosts(since: string, until: string): Promise<FacebookPostCandidate[]> }

const MAX_RESPONSE_BYTES = 256 * 1024;
async function boundedJson(response: Response): Promise<unknown> {
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > MAX_RESPONSE_BYTES) throw new FacebookRequestError('Facebook response exceeded the maximum allowed size.', true);
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) throw new FacebookRequestError('Facebook response exceeded the maximum allowed size.', true);
  try { return JSON.parse(text); } catch { return null; }
}

export class FacebookClient implements FacebookClientLike {
  constructor(private readonly pageId: string, private readonly token: string, private readonly version: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async publishLink(message: string, link: string): Promise<FacebookPostResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await this.fetchImpl(`https://graph.facebook.com/${this.version}/${encodeURIComponent(this.pageId)}/feed`, {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ message, link, access_token: this.token }), signal: controller.signal,
      });
      const body = await boundedJson(response) as { id?: string; post_id?: string; permalink_url?: string; error?: { message?: string; code?: number; error_subcode?: number; type?: string; is_transient?: boolean } } | null;
      if (!response.ok || !body || body.error) {
        const error = body?.error;
        const permanent = response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404;
        const retryAfter = response.headers.get('retry-after');
        const retryAfterMs = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1_000 : null;
        throw new FacebookRequestError(`Facebook request rejected (${error?.code ?? response.status}): ${(error?.message ?? 'Unknown error').slice(0, 300)}`, permanent, false, retryAfterMs, { code: error?.code, subcode: error?.error_subcode, type: error?.type?.slice(0, 100), transient: error?.is_transient, traceId: response.headers.get('x-fb-trace-id')?.slice(0, 100) });
      }
      const id = body.id ?? body.post_id;
      if (!id) throw new FacebookRequestError('Facebook response did not include a post ID.', false, true);
      if (!body.permalink_url) throw new FacebookRequestError('Facebook response did not include a visitor-facing permalink.', false, true);
      return { id, url: body.permalink_url };
    } catch (error) {
      if (error instanceof FacebookRequestError) throw error;
      throw new FacebookRequestError('Facebook request outcome is uncertain.', false, true);
    } finally { clearTimeout(timer); }
  }

  async findPagePosts(since: string, until: string): Promise<FacebookPostCandidate[]> {
    const query = new URLSearchParams({ fields: 'id,permalink_url,message,link,created_time', since, until, limit: '100', access_token: this.token });
    const response = await this.fetchImpl(`https://graph.facebook.com/${this.version}/${encodeURIComponent(this.pageId)}/feed?${query}`);
    const body = await boundedJson(response) as { data?: Array<{ id?: string; permalink_url?: string; message?: string; link?: string; created_time?: string }>; error?: { message?: string; code?: number } } | null;
    if (!response.ok || body?.error) throw new FacebookRequestError(`Facebook read-back failed (${body?.error?.code ?? response.status}): ${(body?.error?.message ?? 'Unknown error').slice(0, 300)}`, response.status === 400 || response.status === 401 || response.status === 403, false, response.status === 429 ? 30_000 : null);
    return (body?.data ?? []).filter((item): item is Required<typeof item> => Boolean(item.id && item.permalink_url && item.message && item.link && item.created_time)).map((item) => ({ id: item.id, url: item.permalink_url, message: item.message, link: item.link, createdTime: item.created_time }));
  }
}
