import { expect, test } from '@playwright/test'

test('reviewed river gaps render continuously and the network retains its lake outlet', async ({ page }, testInfo) => {
  test.setTimeout(60000)
  await page.setViewportSize({ width: 1000, height: 800 })
  await page.route('**/river-junction-test', route => route.fulfill({ contentType: 'text/html',
    body: '<body style="margin:0"><div id="map" style="width:100vw;height:100vh"></div></body>' }))
  await page.goto('/river-junction-test')
  const audit = await page.evaluate(async () => {
    localStorage.setItem('app-settings', JSON.stringify({ center: [-34.4, 11.8], zoom: 8, labelMode: 'native' }))
    const { initMap } = await import(/* @vite-ignore */ '/tests/e2e/fixtures/' + 'mapHarness.ts')
    ;(window as any).riverMap = await initMap(document.getElementById('map'))
    const data = await (await fetch('/assets/maps/kovyalo/ziemund/rivers-flow.geojson')).json()
    return data.hydrology
  })
  expect(audit.networkComponents).toBe(1)
  expect(audit.outletType).toBe('lake')
  expect(audit.outletAccumulationKm2).toBeCloseTo(audit.contributingAreaKm2, 5)
  await expect.poll(() => page.evaluate(() => !!(window as any).riverMap.mlMap.getLayer('town-marker-obstacles'))).toBe(true)
  const toCoordinate = ([x, y]: number[]) => [-36.6552 + (x + 0.5) / 4000 * 4.068,
    14.54625 - (y + 0.5) / 5642 * 5.461875]
  const points = audit.repairs.map((repair: any) => toCoordinate([
    (repair.from[0] + repair.to[0]) / 2, (repair.from[1] + repair.to[1]) / 2]))
  points.push(toCoordinate(audit.outletPixel))
  for (const [index, center] of points.entries()) {
    await page.evaluate(center => (window as any).riverMap.mlMap.jumpTo({ center, zoom: 10 }), center)
    await expect.poll(() => page.evaluate(() => (window as any).riverMap.mlMap.loaded())).toBe(true)
    await expect.poll(() => page.evaluate(center => {
      const map = (window as any).riverMap.mlMap
      return map.queryRenderedFeatures(map.project(center), { layers: ['region-ziemund-rivers'] }).length
    }, center)).toBeGreaterThan(0)
    if (index === 2 || index === points.length - 1) await page.screenshot({ path: testInfo.outputPath(index === 2 ? 'confluence.png' : 'lake-outlet.png') })
  }
  await page.evaluate(() => (window as any).riverMap.unmount())
})
