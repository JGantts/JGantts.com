import { expect, test } from '@playwright/test'

// Keep fixture API requests intercepted after reload; worker behavior has its own tests.
test.use({ serviceWorkers: 'block' })

function post(id: string, dimensions: number[][]) {
  return {
    id, slug: id, title: id, bodyHtml: '', bodyMarkdown: '', date: null, time: null,
    location: null, publishedAt: '2026-09-26T00:00:00Z', updatedAt: '2026-09-26T00:00:00Z',
    canonicalUrl: `/photos/${id}`, shareUrl: `/photos/${id}`, heroMediaId: null,
    media: dimensions.map(([width, height], index) => ({
      id: `${id}-${index}`, width, height, altText: `${id} photo ${index + 1}`,
      focalX: null, focalY: null, renditions: [],
      urls: { thumbnail: '/media/test.jpg', large: '/media/test.jpg' },
    })),
  }
}

// Viewing E moves it from the beginning to the end of the display order. Its
// second photo then cannot fit beside its first in the original greedy layout.
const posts = [
  post('d', [[4029, 2875]]), post('c', [[3622, 2101]]),
  post('b', [[4032, 2643]]), post('a', [[5712, 3615]]),
  post('e', [[2048, 1536], [4032, 3024]]),
]

test('saved viewing history cannot blank the gallery on reload or resize', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/build', route => route.fulfill({ json: { commitId: 'test' } }))
  await page.route('**/api/posts**', route => route.fulfill({ json:
    route.request().url().includes('/comments/')
      ? { comments: [], state: 'not_syndicated', stale: false, truncated: false }
      : { items: posts, nextCursor: null },
  }))
  await page.route('**/media/**', route => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="seagreen"/></svg>',
  }))
  await page.goto('/photos')
  await expect(page.locator('.photo-card')).toHaveCount(6)
  await page.evaluate(() => localStorage.setItem('photo-post-exposure-v1', JSON.stringify({
    'local:e': { qualifiedViews: 1, attentionSeconds: 1, lastSeenAt: Date.now() },
  })))
  await page.reload()
  await expect(page.locator('.photo-card')).toHaveCount(6)
  expect(await page.locator('.photo-masonry').evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(0)
  await expect(page.locator('.photo-card').first()).toBeVisible()

  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.locator('.photo-card')).toHaveCount(6)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(page.locator('.photo-card')).toHaveCount(6)
  await page.locator('[data-cluster-key="local:e"] .photo-card').first().click()
  await expect(page).toHaveURL(/\/photos\/e$/)
  await page.locator('[data-cluster-key="local:e"] .photo-card').first().click()
  await expect(page.getByRole('dialog', { name: 'Photo viewer' })).toBeVisible()
  expect(errors).toEqual([])
})
