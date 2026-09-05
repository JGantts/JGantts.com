export class AdminApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export async function adminRequest<T>(pathname: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(pathname, { ...options, credentials: 'same-origin' })
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.json() as { error?: { message?: unknown } }
      if (typeof body.error?.message === 'string') message = body.error.message
    } catch {
      // The status remains useful when an intermediary returns a non-JSON error.
    }
    throw new AdminApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function createAdminSession(token: string): Promise<void> {
  await adminRequest('/api/admin/session', jsonRequest('POST', { token }))
}

export async function deleteAdminSession(): Promise<void> {
  await adminRequest('/api/admin/session', { method: 'DELETE' })
}

export function jsonRequest(method: string, body?: unknown): RequestInit {
  return {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    method,
  }
}
