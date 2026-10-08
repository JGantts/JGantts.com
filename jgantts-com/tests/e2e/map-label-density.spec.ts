import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

test('phone map shows roughly half as many labels with breathing room', async ({ page }) => {
  await page.route('**/map-label-test', route => route.fulfill({
    contentType: 'text/html',
    body: '<div id="map" style="width:390px;height:844px"></div>',
  }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/map-label-test')
  await page.addScriptTag({ path: require.resolve('maplibre-gl/dist/maplibre-gl.js') })
  await page.addStyleTag({ path: require.resolve('maplibre-gl/dist/maplibre-gl.css') })
  await page.evaluate(async ({ fontUrl, sourceUrl, regions }) => {
    await import(/* @vite-ignore */ fontUrl)
    await document.fonts.load('400 18px "Noto Serif"', 'Gavuá Pite Çhíety')
    const { initMapSourcesAndLayers } = await import(/* @vite-ignore */ sourceUrl)
    const map = new (window as any).maplibregl.Map({
      container: 'map', center: [-34.3, 12], zoom: 6.3, bearing: 0,
      fadeDuration: 0, attributionControl: false,
      style: { version: 8, sources: {}, layers: [] },
    })
    ;(window as any).townTestMap = map
    await new Promise(resolve => map.on('load', resolve))
    await initMapSourcesAndLayers(map, regions)
  }, {
    regions: JSON.parse(readFileSync('../maps-sources/geo-data/regions.json', 'utf8')).regions.map((r: any) => ({ ...r, base: undefined, background: undefined, layers: [] })),
    fontUrl: `/@fs${require.resolve('@fontsource/noto-serif/400.css')}`,
    sourceUrl: '/src/views/kovyalo/maps/initSources.ts',
  })

  const countLabels = () => page.evaluate(() => {
    const map = (window as any).townTestMap
    return new Set(map.queryRenderedFeatures({ layers: ['towns-layer'] }).map((f: any) => f.properties.name)).size
  })
  await page.evaluate(() => new Promise(resolve => (window as any).townTestMap.once('idle', resolve)))
  const spaced = await countLabels()
  await page.evaluate(() => {
    const map = (window as any).townTestMap
    map.setLayoutProperty('towns-layer', 'icon-padding', 0)
    return new Promise(resolve => map.once('idle', resolve))
  })
  const original = await countLabels()
  expect(original).toBeGreaterThan(0)
  expect(spaced / original).toBeGreaterThanOrEqual(0.4)
  expect(spaced / original).toBeLessThanOrEqual(0.65)
  await page.evaluate(() => (window as any).townTestMap.remove())
})
