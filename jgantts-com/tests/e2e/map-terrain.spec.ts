import { expect, test } from '@playwright/test'

test('elevation loads and overzooms without missing DEM tiles', async ({ page }, testInfo) => {
  test.setTimeout(60000)
  await page.route('**/terrain-test', route => route.fulfill({ contentType: 'text/html',
    body: '<body style="margin:0"><div id="map" style="width:100vw;height:100vh"></div></body>' }))
  await page.setViewportSize({ width: 1200, height: 800 })
  await page.goto('/terrain-test')
  await page.evaluate(async () => {
    localStorage.setItem('app-settings', JSON.stringify({ center: [-34.4, 11.8], zoom: 8, pitch: 55 }))
    const { initMap, waitForMapIdle } = await import(/* @vite-ignore */ '/tests/e2e/fixtures/' + 'mapHarness.ts')
    ;(window as any).waitForMapIdle = waitForMapIdle
    ;(window as any).terrainMap = await initMap(document.getElementById('map'))
    ;(window as any).terrainErrors = []
    ;(window as any).terrainMap.mlMap.on('error', (event: any) => (window as any).terrainErrors.push(event.error.message))
  })
  await expect.poll(() => page.evaluate(() => (window as any).terrainMap.mlMap.getTerrain())).toEqual({ source: 'terrain', exaggeration: 10 })
  for (const zoom of [8, 10]) {
    await page.evaluate(zoom => (window as any).terrainMap.mlMap.jumpTo({ zoom }), zoom)
    await expect.poll(() => page.evaluate(() => (window as any).terrainMap.mlMap.areTilesLoaded()), { timeout: 20000 }).toBe(true)
    await expect.poll(() => page.evaluate(() => (window as any).terrainMap.mlMap.queryTerrainElevation([-34.4, 11.8])), { timeout: 20000 }).toBeGreaterThan(0)
  }
  await page.evaluate(() => (window as any).waitForMapIdle((window as any).terrainMap.mlMap))
  await page.screenshot({ path: testInfo.outputPath('terrain-pitched.png') })
  expect(await page.evaluate(() => (window as any).terrainErrors)).toEqual([])
  await page.evaluate(() => (window as any).terrainMap.unmount())
})
