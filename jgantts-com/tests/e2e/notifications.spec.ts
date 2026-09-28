import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/build', route => route.fulfill({ json: { commitId: 'dev', commitMessage: 'Notification test' } }))
  await page.route('**/api/push/config', route => route.fulfill({ json: { enabled: false, publicKey: '', keyVersion: 'disabled', payloadVersion: 1 } }))
})

test('Home Screen guidance and persistent navigation work on narrow screens', async ({ page }) => {
  await page.goto('/install')
  await expect(page.getByRole('button', { name: 'Open share menu' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'JGantts, a tap away.' })).toBeVisible()
  await expect(page.getByText('Open as Web App', { exact: true })).toBeVisible()
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest')
  expect(await page.locator('.install-app img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 192)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Notifications', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  await expect(page.getByText('New subscriptions are temporarily unavailable.')).toBeVisible()
  expect(await page.evaluate(() => Notification.permission)).toBe('default')
  await page.screenshot({ path: '/tmp/jgantts-notifications-mobile.png', fullPage: true })
})

test('standalone app hides installation prompts and exposes notification settings', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window)
    window.matchMedia = (query: string) => {
      const media = original(query)
      if (query === '(display-mode: standalone)') Object.defineProperty(media, 'matches', { value: true })
      return media
    }
  })
  await page.goto('/install')
  await expect(page.getByText("You're already using the Home Screen app.")).toBeVisible()
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Add to Home Screen' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Manage notifications' })).toBeVisible()
  await page.setViewportSize({ width: 844, height: 390 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('iPhone browser is guided to install and never starts subscription setup', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile Safari/604.1' }))
  await page.goto('/notifications')
  await expect(page.getByRole('heading', { name: 'Add JGantts to your Home Screen' })).toBeVisible()
  await page.getByRole('link', { name: 'How to install' }).click()
  await expect(page).toHaveURL(/\/install$/)
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  await page.screenshot({ path: '/tmp/jgantts-install-mobile.png', fullPage: true })
})

test('real root worker registers without intercepting network requests', async ({ page }) => {
  await page.goto('/notifications')
  const registration = await page.evaluate(async () => {
    const worker = await navigator.serviceWorker.ready
    return { scope: worker.scope, script: worker.active?.scriptURL }
  })
  expect(registration.scope).toBe('http://127.0.0.1:42301/')
  expect(registration.script).toBe('http://127.0.0.1:42301/sw.js')
  const manifest = await page.request.get('/manifest.webmanifest')
  expect((await manifest.json()).display).toBe('standalone')
  await page.getByRole('link', { name: 'Follow the Atom feed' }).focus()
  await expect(page.getByRole('link', { name: 'Follow the Atom feed' })).toBeFocused()
})

for (const section of ['posts', 'photos']) {
  test(`${section} can recover from a failed content request without a browser toolbar`, async ({ page }) => {
    let attempts = 0
    await page.route('**/api/posts*', route => ++attempts === 1 ? route.abort('internetdisconnected') : route.fulfill({ json: { items: [], nextCursor: null } }))
    await page.goto(`/${section}`)
    await page.getByRole('button', { name: `Retry loading ${section}`, exact: true }).click()
    await expect(page.getByRole('button', { name: `Retry loading ${section}`, exact: true })).toHaveCount(0)
    expect(attempts).toBe(2)
  })
}

test('updating the worker waits for an open page instead of taking over or reloading it', async ({ page }) => {
  const source = fs.readFileSync(path.resolve('PUBLIC/sw.js'), 'utf8')
  let version = 1
  const server = http.createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    if (request.url === '/sw.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(`${source}\n// revision ${version}`); return }
    response.setHeader('Content-Type', 'text/html')
    response.end('<!doctype html><title>Worker update canary</title><script>sessionStorage.loads = Number(sessionStorage.loads || 0) + 1; navigator.serviceWorker.register("/sw.js");</script><p>Page stays open</p>')
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    await page.goto(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`)
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload()
    expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
    const loads = await page.evaluate(() => sessionStorage.loads)
    version = 2
    await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update() })
    await expect.poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).waiting))).toBe(true)
    expect(await page.evaluate(() => sessionStorage.loads)).toBe(loads)
    await expect(page.getByText('Page stays open')).toBeVisible()
  } finally {
    await page.goto('about:blank')
    await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections() })
  }
})

test('subscribers can edit daily and weekly limits and reload saved preferences on mobile', async ({ page }) => {
  const id = '184a1f93-09e2-430d-8016-1f0765693f00'
  let limits: { maxPerDay: number | null; maxPerWeek: number | null } = { maxPerDay: 2, maxPerWeek: 3 }
  await page.addInitScript(({ id }) => {
    localStorage.setItem('jgantts.push.installation.v1', JSON.stringify({ id, credential: 'owner', endpoint: 'https://web.push.apple.com/example', keyVersion: 'v1' }))
    Object.defineProperty(Notification, 'permission', { get: () => 'granted' })
    const subscription = { endpoint: 'https://web.push.apple.com/example', toJSON: () => ({ endpoint: 'https://web.push.apple.com/example' }) }
    navigator.serviceWorker.register = async () => ({ active: {}, pushManager: { getSubscription: async () => subscription } }) as unknown as ServiceWorkerRegistration
  }, { id })
  await page.route('**/api/push/config', route => route.fulfill({ json: { enabled: true, publicKey: 'key', keyVersion: 'v1', payloadVersion: 1 } }))
  await page.route('**/api/push/subscriptions', route => route.fulfill({ json: { id } }))
  await page.route('**/api/push/subscriptions/*/preferences', route => {
    expect(route.request().headers()['x-push-credential']).toBe('owner')
    if (route.request().method() === 'PUT') limits = route.request().postDataJSON()
    return route.fulfill({ json: limits })
  })
  await page.goto('/notifications')
  await expect(page.getByLabel('Max per day')).toHaveValue('2')
  await expect(page.getByLabel('Max per week')).toHaveValue('3')
  await page.getByLabel('Max per day').fill('1')
  await page.getByLabel('Max per week').fill('')
  await page.getByRole('button', { name: 'Save limits' }).click()
  await expect(page.getByText('Limits saved.')).toBeVisible()
  expect(limits).toEqual({ maxPerDay: 1, maxPerWeek: null })
  await page.reload()
  await expect(page.getByLabel('Max per day')).toHaveValue('1')
  await expect(page.getByLabel('Max per week')).toHaveValue('')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '/tmp/notification-limits-mobile.png', fullPage: true })
})
