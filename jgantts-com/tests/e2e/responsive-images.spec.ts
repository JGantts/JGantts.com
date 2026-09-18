import { expect, test } from '@playwright/test'

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Avb1AAAAAElFTkSuQmCC',
  'base64',
)

const widths = [320, 480, 768, 1024, 1600, 2400]
const renditions = widths.flatMap((width) => [
  {
    byteSize: width, colorSpace: 'srgb', format: 'webp', height: Math.round(width * 0.75),
    privateMetadataStripped: true, purpose: 'responsive', url: `/media/media-1/w-${width}`,
    variant: `w-${width}`, width,
  },
  ...(width >= 768 ? [{
    byteSize: width, colorSpace: 'srgb', format: 'avif', height: Math.round(width * 0.75),
    privateMetadataStripped: true, purpose: 'responsive', url: `/media/media-1/avif-w-${width}`,
    variant: `avif-w-${width}`, width,
  }] : []),
  {
    byteSize: width, colorSpace: 'srgb', format: 'jpeg', height: Math.round(width * 0.75),
    privateMetadataStripped: true, purpose: 'responsive', url: `/media/media-1/jpeg-w-${width}`,
    variant: `jpeg-w-${width}`, width,
  },
])

const post = {
  bodyHtml: '<p>Responsive photo</p>', bodyMarkdown: 'Responsive photo',
  canonicalUrl: '/photos/responsive-photo', createdAt: '2026-09-17T12:00:00.000Z',
  date: 20260917, heroMediaId: null, id: 'responsive-photo', location: null,
  media: [{
    altText: 'Responsive test photo', byteSize: 1, caption: null, checksumSha256: 'test',
    createdAt: '2026-09-17T12:00:00.000Z', date: null, displayOrder: 0,
    focalX: null, focalY: null, height: 1800, id: 'media-1', location: null,
    mimeType: 'image/jpeg', pipelineVersion: 1, placeholder: null, postId: 'responsive-photo',
    processingState: 'ready', renditions, time: null, title: null,
    updatedAt: '2026-09-17T12:00:00.000Z', width: 2400,
    urls: {
      large: '/media/media-1/large', original: '/media/media-1/original',
      thumbnail: '/media/media-1/thumbnail',
    },
  }],
  preview: 'preview', publishedAt: '2026-09-17T12:00:00.000Z', revision: 1,
  shareUrl: '/photos/responsive-photo', slug: 'responsive-photo', status: 'published',
  time: '12:00', title: 'Responsive photo', updatedAt: '2026-09-17T12:00:00.000Z',
}

test('gallery and lightbox request bounded responsive renditions instead of aliases', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 800 })
  const mediaRequests: string[] = []
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (pathname.startsWith('/media/')) mediaRequests.push(pathname)
  })
  await page.route('**/api/posts**', (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname.endsWith('/comments/mastodon')) {
      return route.fulfill({ json: {
        comments: [], remoteUrl: null, stale: false, state: 'not_syndicated', truncated: false,
      } })
    }
    return route.fulfill({ json: { items: [post] } })
  })
  await page.route('**/media/**', (route) => route.fulfill({
    body: transparentPng, contentType: 'image/png',
  }))

  await page.goto('/photos/responsive-photo')
  const tile = page.locator('.photo-card img')
  await expect(tile).toHaveAttribute('srcset', /jpeg-w-/)
  await expect.poll(() => tile.evaluate((image: HTMLImageElement) => image.currentSrc)).toMatch(/\/media\/media-1\/(?:avif-|w-|jpeg-)/)
  expect(mediaRequests.some((path) => /\/(?:thumbnail|large|original)$/.test(path))).toBe(false)

  await page.locator('.photo-card').click()
  const dialog = page.getByRole('dialog', { name: 'Photo viewer' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('figcaption')).toHaveText('Responsive photo')
  await expect(dialog.locator('figcaption')).not.toContainText('Responsive test photo')
  const expanded = dialog.locator('img')
  await expect.poll(() => expanded.evaluate((image: HTMLImageElement) => image.currentSrc)).toMatch(/\/media\/media-1\/(?:avif-|w-|jpeg-)/)
  expect(mediaRequests.some((path) => /\/(?:thumbnail|large|original)$/.test(path))).toBe(false)
  expect(mediaRequests.some((path) => /w-2400$/.test(path))).toBe(false)

  await page.setViewportSize({ width: 390, height: 844 })
  const mobilePhoto = dialog.locator('.lightbox-photo')
  await expect(mobilePhoto).toHaveCSS('width', '390px')
  await expect(dialog).toHaveCSS('padding-left', '0px')
  await expect(dialog).toHaveCSS('padding-right', '0px')
})
