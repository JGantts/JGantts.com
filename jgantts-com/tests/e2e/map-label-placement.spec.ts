import { expect, test } from '@playwright/test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

test('close town labels remain visible north-up and after rotation', async ({ page }) => {
  await page.route('**/map-label-test', route => route.fulfill({
    contentType: 'text/html',
    body: '<div id="map" style="width:900px;height:600px"></div>',
  }))
  await page.setViewportSize({ width: 900, height: 600 })
  await page.goto('/map-label-test')
  await page.addScriptTag({ path: require.resolve('maplibre-gl/dist/maplibre-gl.js') })
  await page.addStyleTag({ path: require.resolve('maplibre-gl/dist/maplibre-gl.css') })
  await page.evaluate(async ({ fontUrl, sourceUrl }) => {
    await import(/* @vite-ignore */ fontUrl)
    await document.fonts.load('400 18px "Noto Serif"', 'Gavuá Pite Çhíety')
    const { initMapSourcesAndLayers } = await import(/* @vite-ignore */ sourceUrl)
    const map = new (window as any).maplibregl.Map({
      container: 'map', center: [-34.248, 11.554], zoom: 8, bearing: 0,
      fadeDuration: 0, attributionControl: false,
      style: { version: 8, sources: {}, layers: [] },
    })
    ;(window as any).townTestMap = map
    await new Promise(resolve => map.on('load', resolve))
    await initMapSourcesAndLayers(map, [{
      id: 'world', zoom: { min: 0, max: 10 }, layers: [],
      dataSources: [{ kind: 'towns', points: [
        { name: 'Gavuá', coordinates: [-34.237, 11.561], population: 300 },
        { name: 'Pite', coordinates: [-34.26, 11.560], population: 300 },
        { name: 'Çhíety', coordinates: [-34.248, 11.544], population: 300 },
      ] }],
    }])
  }, {
    fontUrl: `/@fs${require.resolve('@fontsource/noto-serif/400.css')}`,
    sourceUrl: '/src/views/kovyalo/maps/initSources.ts',
  })

  for (const zoom of [8, 9, 10]) {
    for (const bearing of [0, 45, 90, 0]) {
      await page.evaluate(({ zoom, bearing }) => {
        ;(window as any).townTestMap.jumpTo({ zoom, bearing })
      }, { zoom, bearing })
      await expect.poll(() => page.evaluate(() => {
        const features = (window as any).townTestMap.queryRenderedFeatures({ layers: ['towns-layer'] })
        return [...new Set(features.map((feature: any) => feature.properties.name))].sort()
      }), { message: `All three labels at zoom ${zoom}, bearing ${bearing}` }).toEqual(['Gavuá', 'Pite', 'Çhíety'])
    }
  }
  await page.evaluate(() => (window as any).townTestMap.remove())
})
