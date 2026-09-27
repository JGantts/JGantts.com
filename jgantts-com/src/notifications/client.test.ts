import { beforeEach, describe, expect, it, vi } from 'vitest'

const subscription = { endpoint: 'https://web.push.apple.com/example', toJSON: () => ({ endpoint: 'https://web.push.apple.com/example', keys: { p256dh: 'key', auth: 'auth' } }), unsubscribe: vi.fn() }
const registration = { active: {}, pushManager: { subscribe: vi.fn(), getSubscription: vi.fn() } }
const config = { enabled: true, publicKey: 'BA', keyVersion: 'v1', payloadVersion: 1 }
beforeEach(() => {
  vi.resetModules(); vi.restoreAllMocks()
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) })
  registration.pushManager.subscribe = vi.fn().mockResolvedValue(subscription)
  registration.pushManager.getSubscription = vi.fn().mockResolvedValue(subscription)
  subscription.unsubscribe = vi.fn().mockImplementation(async () => { registration.pushManager.getSubscription.mockResolvedValue(null); return true })
  vi.stubGlobal('isSecureContext', true)
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register: vi.fn().mockResolvedValue(registration) } })
})
describe('installation lifecycle', () => {
  it('registers one root worker without taking over or caching fetches', async () => {
    const client = await import('./client')
    await client.prepareWorker(); await client.prepareWorker()
    expect(navigator.serviceWorker.register).toHaveBeenCalledTimes(1)
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' })
  })
  it('persists a management credential before sending and retries a lost response with the same credential', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response(JSON.stringify({ id: '184a1f93-09e2-430d-8016-1f0765693f00' }), { status: 201 }))
    vi.stubGlobal('fetch', fetch)
    const client = await import('./client')
    await expect(client.subscribe(registration as unknown as ServiceWorkerRegistration, config)).rejects.toThrow('offline')
    const first = client.storedInstallation()!
    expect(first.endpoint).toBe(subscription.endpoint); expect(first.credential).toHaveLength(43); expect(first.id).toBeUndefined()
    await client.persistSubscription(subscription as unknown as PushSubscription, config)
    expect(client.storedInstallation()?.credential).toBe(first.credential)
    expect(client.storedInstallation()?.id).toBe('184a1f93-09e2-430d-8016-1f0765693f00')
    expect(JSON.parse(fetch.mock.calls[0][1].body).credential).toBe(JSON.parse(fetch.mock.calls[1][1].body).credential)
  })
  it('retains pending unsubscribe until server and browser both succeed, including while enrollment is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ id: '184a1f93-09e2-430d-8016-1f0765693f00' }), { status: 201 })))
    const client = await import('./client'); await client.subscribe(registration as unknown as ServiceWorkerRegistration, config)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response(null, { status: 204 })))
    await expect(client.disable(registration as unknown as ServiceWorkerRegistration)).rejects.toThrow('offline')
    expect(client.storedInstallation()?.disabling).toBe(true); expect(subscription.unsubscribe).not.toHaveBeenCalled()
    await client.disable(registration as unknown as ServiceWorkerRegistration)
    expect(client.storedInstallation()).toBeNull(); expect(subscription.unsubscribe).toHaveBeenCalledOnce()
  })
  it('can explicitly reset an orphaned browser subscription without silently subscribing again', async () => {
    const client = await import('./client'); vi.stubGlobal('fetch', vi.fn())
    await client.disable(registration as unknown as ServiceWorkerRegistration)
    expect(subscription.unsubscribe).toHaveBeenCalledOnce(); expect(registration.pushManager.subscribe).not.toHaveBeenCalled()
  })
})

it('reconciles revoked permission on a normal app visit without requesting permission', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: '184a1f93-09e2-430d-8016-1f0765693f00' }), { status: 201 })))
  const client = await import('./client')
  await client.subscribe(registration as unknown as ServiceWorkerRegistration, config)
  vi.stubGlobal('PushManager', function () {})
  vi.stubGlobal('Notification', { permission: 'denied' })
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
  await client.reconcileInstallation()
  expect(client.storedInstallation()).toBeNull()
  expect(subscription.unsubscribe).toHaveBeenCalledOnce()
  expect(registration.pushManager.subscribe).toHaveBeenCalledOnce() // Only the original explicit subscription.
})

it('uses the current signing key when retrying setup that never created a browser subscription', async () => {
  const client = await import('./client')
  registration.pushManager.subscribe.mockRejectedValueOnce(new Error('Permission dismissed'))
  await expect(client.subscribe(registration as unknown as ServiceWorkerRegistration, config)).rejects.toThrow('Permission dismissed')
  const pending = client.storedInstallation()!
  expect(pending.endpoint).toBe('')
  const rotated = { ...config, publicKey: 'BQ', keyVersion: 'v2' }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 12 }), { status: 201 })))
  await client.subscribe(registration as unknown as ServiceWorkerRegistration, rotated)
  expect(client.storedInstallation()?.keyVersion).toBe('v2')
  expect(client.storedInstallation()?.credential).toBe(pending.credential)
  expect(registration.pushManager.subscribe.mock.calls[1][0].applicationServerKey).toEqual(new Uint8Array([5]))
})

it('requires reset instead of relabeling an established enrollment after signing-key rotation', async () => {
  const client = await import('./client')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 12 }), { status: 201 })))
  await client.subscribe(registration as unknown as ServiceWorkerRegistration, config)
  const enrolled = client.storedInstallation()
  await expect(client.subscribe(registration as unknown as ServiceWorkerRegistration, { ...config, keyVersion: 'v2' })).rejects.toThrow('Reset this installation')
  expect(client.storedInstallation()).toEqual(enrolled)
  expect(registration.pushManager.subscribe).toHaveBeenCalledOnce()
})


it('replaces a cached numeric installation ID with the server UUID without losing consent', async () => {
  const client = await import('./client')
  const saved = { id: 1, credential: 'existing-credential', endpoint: subscription.endpoint, keyVersion: config.keyVersion }
  localStorage.setItem('jgantts.push.installation.v1', JSON.stringify(saved))
  const id = '184a1f93-09e2-430d-8016-1f0765693f00'
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id }), { status: 201 })))
  expect(await client.persistSubscription(subscription as unknown as PushSubscription, config)).toBe(id)
  expect(client.storedInstallation()).toEqual({ ...saved, id })
  expect(registration.pushManager.subscribe).not.toHaveBeenCalled()
})
