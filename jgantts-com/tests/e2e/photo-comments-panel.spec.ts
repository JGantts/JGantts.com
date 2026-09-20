import { expect, test } from '@playwright/test'

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Avb1AAAAAElFTkSuQmCC',
  'base64',
)

const posts = Array.from({ length: 8 }, (_, index) => ({
  bodyHtml: `<p>Photo context ${index + 1}</p>`,
  bodyMarkdown: `Photo context ${index + 1}`,
  canonicalUrl: `/photos/photo-${index + 1}`,
  contentWarning: null,
  createdAt: `2026-09-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
  date: 20260901 + index,
  description: null,
  excerpt: null,
  heroMediaId: null,
  id: `photo-${index + 1}`,
  location: null,
  media: [{
    altText: `Test photo ${index + 1}`,
    caption: null,
    createdAt: '2026-09-01T12:00:00.000Z',
    date: null,
    description: null,
    displayOrder: 0,
    focalX: null,
    focalY: null,
    height: 900,
    id: `media-${index + 1}`,
    location: null,
    mimeType: 'image/png',
    postId: `photo-${index + 1}`,
    processingState: 'ready',
    renditions: [],
    time: null,
    title: null,
    updatedAt: '2026-09-01T12:00:00.000Z',
    urls: {
      large: `/media/media-${index + 1}/large`,
      original: `/media/media-${index + 1}/original`,
      thumbnail: `/media/media-${index + 1}/thumbnail`,
    },
    width: 1200,
  }],
  preview: `preview-${index + 1}`,
  publishedAt: `2026-09-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
  revision: 1,
  shareUrl: `/photos/photo-${index + 1}`,
  slug: `photo-${index + 1}`,
  status: 'published',
  time: '12:00',
  title: `Photo ${index + 1}`,
  updatedAt: '2026-09-01T12:00:00.000Z',
}))

const comments = Array.from({ length: 18 }, (_, index) => ({
  account: {
    avatarUrl: null,
    displayName: `Commenter ${index + 1}`,
    handle: `commenter${index + 1}@example.social`,
    url: `https://example.social/@commenter${index + 1}`,
  },
  attachments: [],
  contentHtml: `<p>Reply ${index + 1} with enough text to make the panel body scroll.</p>`,
  createdAt: `2026-09-14T${String(index).padStart(2, '0')}:00:00.000Z`,
  id: `reply-${index + 1}`,
  parentId: index === 0 ? null : 'reply-1',
  url: `https://example.social/@commenter/${index + 1}`,
}))

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) => {
    const { pathname } = new URL(route.request().url())
    if (!pathname.startsWith('/api/posts')) return route.continue()
    if (pathname.endsWith('/comments/mastodon')) {
      return route.fulfill({
        json: {
          comments,
          remoteUrl: 'https://example.social/@jgantts/photo',
          stale: false,
          state: 'available',
          truncated: false,
        },
      })
    }
    return route.fulfill({ json: { items: posts } })
  })
  await page.route('**/media/**', (route) => route.fulfill({ body: transparentPng, contentType: 'image/png' }))
})

test('direct photo loads keep comments docked until the user opens them', async ({ page }) => {
  await page.goto('/photos/photo-5')

  const dock = page.locator('.comments-dock-trigger')
  await expect(dock).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Replies' })).toBeHidden()
  await expect(page).toHaveURL(/\/photos\/photo-5$/)
})

test('desktop share button opens the share menu', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/photos/photo-1')

  const shareMenu = page.locator('#photo-comments-panel .photo-share-menu')
  await expect(shareMenu).toBeVisible()
  const shareButton = shareMenu.getByRole('button', { name: 'Share this photo post' })
  await shareButton.click()

  await expect(shareButton).toHaveAttribute('aria-expanded', 'true')
  await expect(shareMenu.locator('.photo-share-popover')).toBeVisible()
  await shareMenu.getByRole('button', { name: 'Share as QR code' }).click()
  await expect(shareMenu.getByRole('img', { name: 'QR code for this photo post' })).toBeVisible()
})

test('mobile share menu opens and enlarges the QR code', async ({ page }) => {
  await page.goto('/photos/photo-1')
  await page.locator('.comments-dock-trigger').click()

  const sheet = page.getByRole('dialog', { name: 'Replies' })
  await sheet.getByRole('button', { name: 'Share this photo post' }).click()
  await sheet.getByRole('button', { name: 'Share as QR code' }).click()

  const qrPreview = sheet.getByRole('button', { name: 'Enlarge QR code to fill the window' })
  await expect(qrPreview).toBeVisible()
  await qrPreview.click()
  await expect(page.getByRole('dialog', { name: 'Scan to view this photo' })).toBeVisible()
})

test('closing the mobile sheet restores the visible gallery', async ({ page }) => {
  await page.goto('/photos')
  const firstPhoto = page.getByRole('button', { name: /Select post from/ }).first()
  await expect(firstPhoto).toBeVisible()
  await firstPhoto.click()
  await page.locator('.comments-dock-trigger').click()

  const sheet = page.getByRole('dialog', { name: 'Replies' })
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: 'Close comments' }).click()

  await expect(sheet).toBeHidden()
  await expect(page.locator('.comments-backdrop')).toBeHidden()
  await expect(page.locator('.gallery-surface')).not.toHaveAttribute('inert', '')
  await expect(page.locator('.gallery-surface img').first()).toBeVisible()
})

test('mobile sheet locks the gallery and has exactly one vertical scroll owner', async ({ page }) => {
  await page.goto('/photos')
  const fifthPhoto = page.getByRole('button', { name: 'Select post from Sep 5, 2026' })
  await fifthPhoto.scrollIntoViewIfNeeded()
  await fifthPhoto.click()
  await page.locator('.comments-dock-trigger').click()

  const sheet = page.getByRole('dialog', { name: 'Replies' })
  await expect(sheet).toBeVisible()
  expect(await sheet.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)')
  await expect(page.locator('.gallery-surface')).toHaveAttribute('inert', '')
  await expect(sheet.locator('.comments-context')).toHaveJSProperty('tagName', 'ARTICLE')
  await expect(sheet.locator('.comments-post-text')).toContainText('Photo 5')
  await expect(sheet.locator('.comments-post-text')).toContainText('Photo context 5')
  await expect(sheet.locator('.comment').first()).toBeInViewport()

  const scrollBefore = await page.evaluate(() => window.scrollY)
  await page.mouse.move(30, 300)
  await page.mouse.wheel(0, 700)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollBefore)
  await expect(sheet).toBeVisible()

  const scrollOwners = await sheet.locator('*').evaluateAll((elements) => elements
    .filter((element) => {
      const style = getComputedStyle(element)
      return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight
    })
    .map((element) => element.className))
  expect(scrollOwners).toEqual(['comments-panel-scroll'])
})

test('keyboard, reduced-motion, and 200% zoom smoke test', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/photos')
  await page.getByRole('button', { name: /Select post from/ }).first().click()

  const dock = page.locator('.comments-dock-trigger')
  await dock.focus()
  await page.keyboard.press('Enter')
  const sheet = page.getByRole('dialog', { name: 'Replies' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Close comments' })).toBeFocused()
  expect(await sheet.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s')

  await page.evaluate(() => { document.documentElement.style.zoom = '2' })
  await expect(sheet.getByRole('button', { name: 'Close comments' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(dock).toBeFocused()
})

test('portrait gestures open from the dock, scroll in content, and close from the header or backdrop', async ({ context, page }) => {
  await page.goto('/photos')
  await page.getByRole('button', { name: /Select post from/ }).first().click()

  const dock = page.locator('.comments-dock-trigger')
  const dockBox = await dock.boundingBox()
  if (!dockBox) throw new Error('Comments dock was not laid out')
  const x = dockBox.x + dockBox.width / 2
  const y = dockBox.y + dockBox.height / 2
  const cdp = await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 30 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 80 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })

  const sheet = page.getByRole('dialog', { name: 'Replies' })
  const scroller = sheet.locator('.comments-panel-scroll')
  await expect(sheet).toBeVisible()
  await expect(page.locator('.comments-backdrop')).toBeVisible()

  await scroller.hover()
  await page.mouse.wheel(0, 650)
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  const scrolledDown = await scroller.evaluate((element) => element.scrollTop)
  await page.mouse.wheel(0, -240)
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeLessThan(scrolledDown)
  await expect(sheet).toBeVisible()

  const header = sheet.locator('.comments-panel-header')
  const headerBox = await header.boundingBox()
  if (!headerBox) throw new Error('Comments header was not laid out')
  await page.mouse.move(headerBox.x + 110, headerBox.y + headerBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(headerBox.x + 110, headerBox.y + headerBox.height + 170, { steps: 6 })
  await page.mouse.up()
  await expect(sheet).toBeHidden()

  await page.locator('.comments-dock-trigger').click()
  await expect(sheet).toBeVisible()
  await page.locator('.comments-backdrop').click({ position: { x: 12, y: 12 } })
  await expect(sheet).toBeHidden()
})
