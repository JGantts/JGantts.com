import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

test('phone map progressively reveals smaller settlements while preserving overview labels', async ({ page }) => {
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
  const overview = await countLabels()
  expect(overview).toBeGreaterThan(0)
  expect(overview).toBeLessThanOrEqual(7)
  await page.evaluate(() => (window as any).townTestMap.jumpTo({ zoom: 7.3 }))
  await expect.poll(countLabels).toBeGreaterThan(overview)
  await page.evaluate(() => (window as any).townTestMap.jumpTo({ zoom: 5 }))
  await expect.poll(() => page.evaluate(() => {
    const features = (window as any).townTestMap.queryRenderedFeatures({ layers: ['towns-layer'] })
    const names = [...new Set(features.map((f: any) => f.properties.name))]
    return names.length >= 1 && names.length <= 2 && names.every(name => ['洲湍', 'Rócyabó'].includes(name as string))
  })).toBe(true)
  const visibleNames = (layer: string) => page.evaluate(layer =>
    [...new Set((window as any).townTestMap.queryRenderedFeatures({ layers: [layer] }).map((f: any) => f.properties.name))].sort(), layer)
  await expect.poll(async () => ({ dots: await visibleNames('town-dots'), labels: await visibleNames('towns-layer') }))
    .toEqual({ dots: await visibleNames('towns-layer'), labels: await visibleNames('towns-layer') })
  await page.evaluate(() => (window as any).townTestMap.jumpTo({ zoom: 4 }))
  await expect.poll(countLabels).toBe(0)
  await expect.poll(() => visibleNames('town-dots')).toEqual([])
  await expect.poll(() => page.evaluate(() =>
    (window as any).townTestMap.queryRenderedFeatures({ layers: ['region-label-ziemund'] }).length
  )).toBeGreaterThan(0)
  await page.evaluate(() => (window as any).townTestMap.jumpTo({ zoom: 6.3 }))
  await expect.poll(async () => (await visibleNames('town-dots')).length).toBeGreaterThan(2)
  await page.evaluate(() => (window as any).townTestMap.remove())
})
