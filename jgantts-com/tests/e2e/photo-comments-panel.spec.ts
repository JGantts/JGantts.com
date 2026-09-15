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

test('mobile sheet locks the gallery and has exactly one vertical scroll owner', async ({ page }) => {
  await page.goto('/photos')
  await page.getByRole('button', { name: /Select post from/ }).nth(4).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: /Select post from/ }).nth(4).click()
  await page.getByRole('button', { name: /View comments/ }).click()

  const sheet = page.getByRole('dialog', { name: 'Replies' })
  await expect(sheet).toBeVisible()
  await expect(page.locator('.gallery-surface')).toHaveAttribute('inert', '')

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

  const dock = page.getByRole('button', { name: /View comments/ })
  await dock.focus()
  await page.keyboard.press('Enter')
  const sheet = page.getByRole('dialog', { name: 'Replies' })
  await expect(sheet).toBeVisible()
  await expect(page.getByRole('button', { name: 'Close comments' })).toBeFocused()
  expect(await sheet.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s')

  await page.evaluate(() => { document.documentElement.style.zoom = '2' })
  await expect(page.getByRole('button', { name: 'Close comments' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(dock).toBeFocused()
})
