import { expect, it, vi } from 'vitest'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { RegionConfig } from './types/maps'
import { addRegionLabels } from './regionLabels'

vi.mock('./rubyLabels', () => ({ townNameProperties: (_map: unknown, native: string, hangul: string, latin: string) => ({ native, hangul, latin }) }))

it('uses region titles, positions and display zoom ranges, excluding the world', () => {
  const map = { addSource: vi.fn(), addLayer: vi.fn() }
  const region = {
    id: 'ziemund', title: { native: 'siemúnd', latin: 'siemund' },
    bounds: [[14, -36], [10, -32]], labelCoordinates: [-35, 13],
    zoom: { data: { min: 0, max: 5 }, display: { min: 6, max: 10 } },
  } as RegionConfig
  addRegionLabels(map as unknown as MapLibreMap, [{ ...region, id: 'world' }, region], 'both')
  expect(map.addSource).toHaveBeenCalledOnce()
  expect(map.addSource.mock.calls[0][1].data).toMatchObject({
    geometry: { coordinates: [-35, 13] }, properties: { native: 'siemúnd', latin: 'siemund' },
  })
  expect(map.addLayer.mock.calls[0][0]).toMatchObject({ minzoom: 4, maxzoom: 10, layout: { 'icon-image': ['get', 'bothImage'] } })
})

it('centers a region without a custom position and supports plain titles', () => {
  const map = { addSource: vi.fn(), addLayer: vi.fn() }
  addRegionLabels(map as unknown as MapLibreMap, [{
    id: 'kovyalo', title: 'Kovyálo', bounds: [[14, -48], [-4, -22]], zoom: { min: 4, max: 7 },
  } as RegionConfig], 'native')
  expect(map.addSource.mock.calls[0][1].data).toMatchObject({
    geometry: { coordinates: [-35, 5] }, properties: { native: 'Kovyálo' },
  })
})
