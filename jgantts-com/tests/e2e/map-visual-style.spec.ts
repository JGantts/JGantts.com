import { expect, test } from '@playwright/test'

test('real map styles preserve layer order and black backgrounds across themes and label modes', async ({ page }, testInfo) => {
  test.setTimeout(90000)
  const warnings: string[] = []
  page.on('console', message => {
    if (/Failed to initialize map|Could not (parse|reserve)|Error evaluating/.test(message.text())) warnings.push(message.text())
  })
  await page.route('**/visual-style-test', route => route.fulfill({ contentType: 'text/html',
    body: '<body style="margin:0;background:black"><div id="map" style="width:100vw;height:100vh"></div></body>' }))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/visual-style-test')
  await page.evaluate(async () => {
    localStorage.setItem('app-settings', JSON.stringify({ center: [-34.4, 11.8], zoom: 7.3, labelMode: 'all', darkMode: 'light' }))
    const { initMap, useSettings, waitForMapIdle } = await import(/* @vite-ignore */ '/tests/e2e/fixtures/' + 'mapHarness.ts')
    ;(window as any).waitForMapIdle = waitForMapIdle
    ;(window as any).visualSettings = useSettings()
    ;(window as any).visualMap = await initMap(document.getElementById('map'))
    ;(window as any).mapErrors = []
    ;(window as any).visualMap.mlMap.on('error', (event: any) => (window as any).mapErrors.push(event.error.message))
  })
  await expect.poll(() => page.evaluate(() => !!(window as any).visualMap.mlMap.getLayer('town-marker-obstacles'))).toBe(true)
  await expect.poll(() => page.evaluate(() => (window as any).visualMap.mlMap.areTilesLoaded())).toBe(true)
  await expect.poll(() => page.evaluate(() => (window as any).visualMap.mlMap.queryRenderedFeatures({ layers: ['towns-layer'] }).length)).toBeGreaterThan(5)
  const evidence = await page.evaluate(() => {
    const map = (window as any).visualMap.mlMap
    const ids = map.getStyle().layers.map((layer: any) => layer.id)
    const markers = map.queryRenderedFeatures({ layers: ['town-dots'] })
    const collisions = markers.filter((feature: any) => {
      const point = map.project(feature.geometry.coordinates)
      return map.queryRenderedFeatures(point, { layers: ['towns-layer'] }).length > 0
    }).length
    return {
      order: ['region-ziemund-states', 'region-ziemund-rivers', 'region-ziemund-borders-casing', 'region-ziemund-borders'].map(id => ids.indexOf(id)),
      backgroundPaint: map.getPaintProperty('region-ziemund-background', 'raster-brightness-min'),
      shadows: map.getPaintProperty('region-ziemund-states', 'raster-brightness-min'),
      labels: map.queryRenderedFeatures({ layers: ['towns-layer'] }).length,
      riverType: map.getLayer('region-ziemund-rivers').type,
      riverFeatures: map.queryRenderedFeatures({ layers: ['region-ziemund-rivers'] }).length,
      collisions,
    }
  })
  expect(evidence.order.every(index => index >= 0)).toBe(true)
  expect(evidence.order).toEqual([...evidence.order].sort((a, b) => a - b))
  expect(evidence.backgroundPaint ?? 0).toBe(0)
  expect(evidence.shadows).toBeGreaterThan(0)
  expect(evidence.labels).toBeGreaterThan(5)
  expect(evidence.collisions).toBe(0)
  expect(evidence.riverType).toBe('line')
  expect(evidence.riverFeatures).toBeGreaterThan(100)
  for (const theme of ['light', 'dark']) {
    for (const labelMode of ['native', 'both', 'nativeHangul', 'all', 'latin', 'hangul']) {
      await page.evaluate(({ theme, labelMode }) => {
        Object.assign((window as any).visualSettings, { darkMode: theme, labelMode })
      }, { theme, labelMode })
      await expect.poll(() => page.evaluate(() => (window as any).visualMap.mlMap.getLayoutProperty('towns-layer', 'icon-image'))).toEqual(['get', `${labelMode}Image`])
      await expect.poll(() => page.evaluate(() => (window as any).visualMap.mlMap.getLayoutProperty('region-ziemund-states-dark', 'visibility'))).toBe(theme === 'dark' ? 'visible' : 'none')
      await expect.poll(() => page.evaluate(() => (window as any).visualMap.mlMap.loaded())).toBe(true)
      await page.evaluate(() => (window as any).waitForMapIdle((window as any).visualMap.mlMap))
      await expect.poll(() => page.evaluate(() => (window as any).visualMap.mlMap.queryRenderedFeatures({ layers: ['towns-layer'] }).length)).toBeGreaterThan(0)
      if (labelMode === 'all') await page.screenshot({ path: testInfo.outputPath(`desktop-${theme}.png`) })
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => {
    ;(window as any).visualSettings.labelMode = 'both'
    const map = (window as any).visualMap.mlMap
    map.resize(); map.jumpTo({ zoom: 6, center: [-34.3927, 11.8405] })
  })
  await expect.poll(() => page.evaluate(() => (window as any).visualMap.mlMap.getLayoutProperty('towns-layer', 'text-size'))).toBe(18)
  await expect.poll(() => page.evaluate(() => (window as any).visualMap.mlMap.loaded())).toBe(true)
  await page.evaluate(() => (window as any).waitForMapIdle((window as any).visualMap.mlMap))
  await expect.poll(() => page.evaluate(() => (window as any).visualMap.mlMap.queryRenderedFeatures({ layers: ['towns-layer'] }).length)).toBeGreaterThan(2)
  await page.screenshot({ path: testInfo.outputPath('phone-dark.png') })
  expect(warnings).toEqual([])
  expect(await page.evaluate(() => (window as any).mapErrors)).toEqual([])
  await page.evaluate(() => (window as any).visualMap.unmount())
})

test('missing generated vectors retain original river and border artwork', async ({ page }) => {
  await page.route('**/borders-classes.geojson', route => route.fulfill({ status: 404, body: '' }))
  await page.route('**/rivers-flow.geojson', route => route.fulfill({ status: 404, body: '' }))
  await page.route('**/boundary-fallback-test', route => route.fulfill({ contentType: 'text/html',
    body: '<body><div id="map" style="width:100vw;height:100vh"></div></body>' }))
  await page.goto('/boundary-fallback-test')
  await page.evaluate(async () => {
    localStorage.setItem('app-settings', JSON.stringify({ center: [-34.4, 11.8], zoom: 7.3 }))
    const { initMap } = await import(/* @vite-ignore */ '/tests/e2e/fixtures/' + 'mapHarness.ts')
    ;(window as any).visualMap = await initMap(document.getElementById('map'))
  })
  await expect.poll(() => page.evaluate(() => !!(window as any).visualMap.mlMap.getLayer('town-marker-obstacles'))).toBe(true)
  await expect.poll(() => page.evaluate(() => (window as any).visualMap.mlMap.areTilesLoaded())).toBe(true)
  const border = await page.evaluate(() => {
    const map = (window as any).visualMap.mlMap
    return { type: map.getLayer('region-ziemund-borders').type,
      rivers: map.getLayer('region-ziemund-rivers').type,
      visibility: map.getLayoutProperty('region-ziemund-borders', 'visibility'),
      casing: !!map.getLayer('region-ziemund-borders-casing') }
  })
  expect(border).toEqual({ type: 'raster', rivers: 'raster', visibility: 'visible', casing: true })
  await page.evaluate(() => (window as any).visualMap.unmount())
})
