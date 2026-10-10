import { expect, test } from '@playwright/test'

test('a blocked graphics context offers reload and recovers without unhandled errors', async ({ page }) => {
  test.setTimeout(60000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    if (sessionStorage.getItem('allow-map-webgl') === 'yes') return
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: any[]) {
      if (type === 'webgl' || type === 'webgl2') {
        const event = new Event('webglcontextcreationerror')
        Object.assign(event, { statusMessage: 'Web page caused context loss and was blocked' })
        this.dispatchEvent(event)
        return null
      }
      return original.apply(this, [type, ...args] as any)
    } as typeof original
  })
  await page.goto('/kovyalo')
  await expect(page.getByRole('alert')).toContainText('could not start the map graphics', { timeout: 30000 })
  expect(errors).toEqual([])
  await page.evaluate(() => sessionStorage.setItem('allow-map-webgl', 'yes'))
  await page.getByRole('button', { name: 'Reload page' }).click()
  await expect(page.locator('.fantasy-map canvas.maplibregl-canvas')).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(errors).toEqual([])
})
