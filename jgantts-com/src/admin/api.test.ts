import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminApiError, adminRequest } from './api'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('adminRequest', () => {
  it('reports the request and server validation message in the console', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      error: {
        code: 'bad_request',
        message: 'time must use an allowed minute interval.',
      },
    }), {
      headers: { 'content-type': 'application/json' },
      status: 400,
      statusText: 'Bad Request',
    }))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(adminRequest('/api/admin/posts/post-id', { method: 'PATCH' }))
      .rejects.toEqual(new AdminApiError('time must use an allowed minute interval.', 400))
    expect(consoleError).toHaveBeenCalledWith(
      '[Admin API] PATCH /api/admin/posts/post-id failed (400 Bad Request) [bad_request]: time must use an allowed minute interval.',
    )
  })
})
