import { expect, test } from '@playwright/test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

test('labels prefer the clear side of a boundary and remain clear of their markers', async ({ page }, testInfo) => {
  await page.route('**/boundary-label-test', route => route.fulfill({
    contentType: 'text/html', body: '<body style="margin:0;background:#526b71"><div id="map" style="width:900px;height:600px"></div></body>',
  }))
  await page.setViewportSize({ width: 900, height: 600 })
  await page.goto('/boundary-label-test')
  await page.addScriptTag({ path: require.resolve('maplibre-gl/dist/maplibre-gl.js') })
  await page.addStyleTag({ path: require.resolve('maplibre-gl/dist/maplibre-gl.css') })
  await page.evaluate(async () => {
    const { initMapSourcesAndLayers, loadBoundaryRaster, refreshBoundaryPlacement } = await import(/* @vite-ignore */ '/tests/e2e/fixtures/' + 'mapHarness.ts')
    const map = new (window as any).maplibregl.Map({
      container: 'map', center: [0, 0], zoom: 8, fadeDuration: 0, attributionControl: false,
      style: { version: 8, sources: {}, layers: [] },
    })
    ;(window as any).boundaryMap = map
    await new Promise(resolve => map.on('load', resolve))
    await initMapSourcesAndLayers(map, [{ id: 'world', zoom: { min: 0, max: 14 }, layers: [],
      dataSources: [{ kind: 'towns', points: [
        { title: { native: 'Boundary Town', latin: 'boundary town' }, coordinates: [-0.08, 0], population: 5200 },
      ] }],
    }])
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#111'; ctx.fillRect(126, 0, 4, 256)
    const url = canvas.toDataURL()
    map.addSource('border', { type: 'image', url, coordinates: [[-1, 1], [1, 1], [1, -1], [-1, -1]] })
    map.addLayer({ id: 'border', type: 'raster', source: 'border' }, 'towns-layer')
    await loadBoundaryRaster(map, 'border', url, [[1, -1], [-1, 1]], 0, 14, {})
    refreshBoundaryPlacement(map)
  })
  await expect.poll(() => page.evaluate(() => (window as any).boundaryMap.queryRenderedFeatures({ layers: ['towns-layer'] }).length)).toBe(1)
  const result = await page.evaluate(() => {
    const map = (window as any).boundaryMap
    const expression = map.getLayoutProperty('towns-layer', 'text-variable-anchor-offset')
    const marker = map.project([-0.08, 0])
    const line = map.project([0, 0])
    return {
      // 'right' anchors the right edge of the text to the point's left side.
      preferredAnchor: expression[3][1][0],
      markerOverlap: map.queryRenderedFeatures([[marker.x - 5, marker.y - 5], [marker.x + 5, marker.y + 5]], { layers: ['towns-layer'] }).length,
      boundaryOverlap: map.queryRenderedFeatures([[line.x - 3, 0], [line.x + 3, 600]], { layers: ['towns-layer'] }).length,
    }
  })
  expect(result).toEqual({ preferredAnchor: 'right', markerOverlap: 0, boundaryOverlap: 0 })
  await page.screenshot({ path: testInfo.outputPath('boundary-clearance.png') })
  await page.evaluate(() => (window as any).boundaryMap.remove())
})
