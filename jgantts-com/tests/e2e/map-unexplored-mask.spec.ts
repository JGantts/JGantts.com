import { expect, test } from '@playwright/test'

test('unexplored terrain masks the southern province overhang in both themes', async ({ page }, testInfo) => {
  test.setTimeout(90000)
  await page.setViewportSize({ width: 600, height: 800 })
  await page.route('**/mask-test', route => route.fulfill({ contentType: 'text/html',
    body: '<body style="margin:0;background:black"><div id="map" style="width:100vw;height:100vh"></div></body>' }))
  await page.goto('/mask-test')
  await page.evaluate(async () => {
    localStorage.setItem('app-settings', JSON.stringify({ center: [-34.0460865, 10.0306676], zoom: 9, pitch: 0 }))
    const { initMap, useSettings, waitForMapIdle } = await import(/* @vite-ignore */ '/tests/e2e/fixtures/' + 'mapHarness.ts')
    ;(window as any).maskMap = await initMap(document.getElementById('map'))
    ;(window as any).maskSettings = useSettings()
    ;(window as any).waitForMapIdle = waitForMapIdle
  })
  await expect.poll(() => page.evaluate(() => !!(window as any).maskMap.mlMap.getLayer('town-marker-obstacles'))).toBe(true)
  const sample = async () => {
    await expect.poll(() => page.evaluate(() => (window as any).maskMap.mlMap.loaded()), { timeout: 20000 }).toBe(true)
    await page.evaluate(() => (window as any).waitForMapIdle((window as any).maskMap.mlMap))
    const png = await page.screenshot()
    return page.evaluate(async encoded => {
      const image = await createImageBitmap(new Blob([Uint8Array.from(atob(encoded), c => c.charCodeAt(0))], { type: 'image/png' }))
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
      const point = (window as any).maskMap.mlMap.project([-34.0460865, 10.0306676])
      return Array.from(context.getImageData(Math.round(point.x), Math.round(point.y), 1, 1).data).slice(0, 3)
    }, png.toString('base64'))
  }
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => { (window as any).maskSettings.darkMode = theme }, theme)
    expect(await sample()).toEqual([0, 0, 0])
    await page.screenshot({ path: testInfo.outputPath(`southern-mask-${theme}.png`) })
    // Prove this pixel would otherwise be painted by the province artwork.
    await page.evaluate(() => (window as any).maskMap.mlMap.setLayoutProperty('region-ziemund-unexplored-mask', 'visibility', 'none'))
    expect(Math.max(...await sample())).toBeGreaterThan(20)
    await page.evaluate(() => (window as any).maskMap.mlMap.setLayoutProperty('region-ziemund-unexplored-mask', 'visibility', 'visible'))
  }
  await page.evaluate(() => (window as any).maskMap.unmount())
})
