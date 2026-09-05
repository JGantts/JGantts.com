import { ref } from 'vue'

export const adminToken = ref('')

export class AdminApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export async function adminRequest<T>(pathname: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('authorization', `Bearer ${adminToken.value}`)
  const response = await fetch(pathname, { ...options, headers })
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
  return response.json() as Promise<T>
}

export function jsonRequest(method: string, body?: unknown): RequestInit {
  return {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    method,
  }
}
