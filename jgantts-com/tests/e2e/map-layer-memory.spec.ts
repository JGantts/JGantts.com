import { expect, test } from '@playwright/test'

test('defaults to Ziemúnd and Rivers and remembers layers across reloads and remounts', async ({ page }) => {
  await page.route('**/map-memory-test', route => route.fulfill({
    contentType: 'text/html', body: '<div id="map" style="width:390px;height:844px"></div>',
  }))
  await page.route('**/assets/maps/geo-data/regions.json', route => route.fulfill({
    json: {
      world: { id: 'world', zoom: { min: 0, max: 10 }, layers: [] },
      regions: [{
        id: 'ziemund', bounds: [[14.54625, -36.6552], [9.084375, -32.5872]],
        zoom: { min: 0, max: 10 }, layers: [
          { id: 'states', type: 'single', uiPath: ['Political', 'National', 'Ziemúnd'] },
          { id: 'rivers', type: 'single', uiPath: ['Physical', 'Terrain', 'Rivers'] },
        ],
      }],
    },
  }))
  await page.route('**/assets/maps/**/*.png', route => route.abort())

  const mount = () => page.evaluate(async sourceUrl => {
    const { initMap } = await import(/* @vite-ignore */ sourceUrl)
    ;(window as any).memoryMap = await initMap(document.getElementById('map'))
  }, '/src/views/kovyalo/maps/maps.ts')
  const visibility = () => page.evaluate(() => {
    const map = (window as any).memoryMap?.mlMap
    return ['states', 'rivers'].map(id => map?.getLayer(`region-ziemund-${id}`)
      ? map.getLayoutProperty(`region-ziemund-${id}`, 'visibility') : null)
  })
  const disable = (title: string) => page.evaluate(title => {
    const visit = (node: any) => {
      if (node.title === title) node.enabled = false
      Object.values(node.children).forEach(visit)
    }
    visit((window as any).memoryMap.guiTree)
  }, title)
  const storedLayers = () => page.evaluate(() => JSON.parse(localStorage.getItem('app-settings') || '{}').enabledLayers)

  await page.goto('/map-memory-test')
  await mount()
  await expect.poll(visibility).toEqual(['visible', 'visible'])
  expect(await page.evaluate(() => {
    const map = (window as any).memoryMap.mlMap
    return { center: map.getCenter().toArray(), zoom: map.getZoom() }
  })).toEqual({ center: [-34.3927, 11.8405], zoom: 6 })

  await disable('Ziemúnd')
  await expect.poll(visibility).toEqual(['none', 'visible'])
  await expect.poll(storedLayers).toEqual(['physical*terrain*rivers'])
  await page.reload()
  await mount()
  await expect.poll(visibility).toEqual(['none', 'visible'])

  await disable('Rivers')
  await expect.poll(storedLayers).toEqual([])
  await page.evaluate(() => (window as any).memoryMap.unmount())
  await mount()
  await expect.poll(visibility).toEqual(['none', 'none'])
  await page.reload()
  await mount()
  await expect.poll(visibility).toEqual(['none', 'none'])
  await page.evaluate(() => (window as any).memoryMap.unmount())
})
