import { expect, test } from '@playwright/test'
const id = '184a1f93-09e2-430d-8016-1f0765693f00'
const now = Date.now()
const dashboard = {
  enabled: true, sendEnabled: true, audience: [id], capturedAt: now,
  activeSubscriptions: 1, pendingEvents: 0, retryingDeliveries: 1, oldestPendingAgeSeconds: 30,
  deliveries: [{ state: 'accepted', count: 1 }, { state: 'pending', count: 1 }],
  events: [{ id: 'post-one', kind: 'publication', state: 'expanded', createdAt: now - 30000, expiresAt: now + 86400000, title: 'Desert evening', slug: 'desert-evening', total: 2, accepted: 1, waiting: 1, failed: 0, cancelled: 0 }],
  recentDeliveries: [
    { id: 2, eventId: 'post-one', installationId: id, state: 'pending', attempts: 1, lastStatus: 429, availableAt: now + 60000, updatedAt: now, createdAt: now - 30000, kind: 'publication', title: 'Desert evening', slug: 'desert-evening', acceptedAfterMs: null },
    { id: 1, eventId: 'test-one', installationId: id, state: 'accepted', attempts: 1, lastStatus: 201, availableAt: now, updatedAt: now, createdAt: now - 1200, kind: 'test', title: null, slug: null, acceptedAfterMs: 1200 },
  ],
  installations: [{ id, active: true, allowed: true, createdAt: now, lastSeenAt: now }],
}
test('admin sign-in, diagnostic filters, single-installation test, and responsive layout', async ({ page }) => {
  let signedIn = false; let testRequests = 0
  await page.route('**/api/build', route => route.fulfill({ json: { commitId: 'dev' } }))
  await page.route('**/api/admin/session', route => { signedIn = route.request().method() !== 'DELETE'; return route.fulfill({ status: 204 }) })
  await page.route('**/api/admin/push/dashboard', route => route.fulfill(signedIn ? { json: dashboard } : { status: 401, json: { error: { message: 'Sign in required.' } } }))
  await page.route('**/api/admin/push/test', route => {
    testRequests++; expect(route.request().postDataJSON()).toEqual({ subscriptionId: id })
    return route.fulfill({ status: 202, json: { eventId: 'test-new' } })
  })
  await page.goto('/admin/notifications')
  await page.getByLabel('Admin token').fill('test-token')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Recent deliveries' })).toBeVisible()
  expect(testRequests).toBe(0)
  await expect(page.getByRole('region', { name: 'Recent deliveries', exact: true })).toContainText('1.2 s')
  await page.getByLabel('Type', { exact: true }).selectOption('publication')
  await expect(page.getByRole('region', { name: 'Recent deliveries', exact: true })).not.toContainText('Test notification')
  await page.getByLabel('Status', { exact: true }).selectOption('failed')
  await expect(page.getByText('No deliveries match these filters.')).toBeVisible()
  await page.getByLabel('Status', { exact: true }).selectOption('all')
  await expect(page.getByRole('button', { name: 'Send test notification' })).toBeDisabled()
  await page.getByLabel('Installation', { exact: true }).selectOption(id)
  await page.getByRole('button', { name: 'Send test notification' }).click()
  await expect(page.getByRole('status')).toContainText('test-new')
  expect(testRequests).toBe(1)
  await page.screenshot({ path: '/tmp/notification-dashboard-mobile.png', fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: '/tmp/notification-dashboard-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByLabel('Admin token')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recent deliveries' })).toHaveCount(0)
})
test('dashboard handles an empty paused queue, refresh failure, and session expiry', async ({ page }) => {
  let state = 'ok'
  await page.route('**/api/build', route => route.fulfill({ json: { commitId: 'dev' } }))
  await page.route('**/api/admin/push/dashboard', route => route.fulfill(state === 'ok' ? { json: { ...dashboard, sendEnabled: false, audience: [], events: [], recentDeliveries: [], installations: [] } } : { status: state === 'expired' ? 401 : 503, json: { error: { message: state === 'expired' ? 'Session expired' : 'Temporarily unavailable' } } }))
  await page.goto('/admin/notifications')
  await expect(page.getByText('No notification events yet.')).toBeVisible()
  await expect(page.getByText('Delivery is paused by server configuration.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send test notification' })).toBeDisabled()
  state = 'error'
  await page.getByRole('button', { name: 'Refresh now' }).click()
  await expect(page.getByText('Showing the last successful snapshot.')).toBeVisible()
  state = 'expired'
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByLabel('Admin token')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recent deliveries' })).toHaveCount(0)
})
