import { expect, it } from 'vitest'
import { boundaryPoints } from './boundaryPlacement'
import { rasterPaint } from './rasterStyle'
import { settlementRadius } from './settlements'
import { labelOffsets } from './townLabels'
import type { RegionLayerConfig } from './types/maps'

it('lifts only opted-in terrain and political rasters, preserving black backgrounds', () => {
  const layer = {} as RegionLayerConfig
  expect(rasterPaint('background', layer)).toEqual({ 'raster-opacity': 1 })
  expect(rasterPaint('base', layer)).toEqual({ 'raster-opacity': 1 })
  expect(rasterPaint('states', layer)?.['raster-brightness-min']).toBeGreaterThan(0)
  expect(rasterPaint('base', { ...layer, styleRole: 'terrain' })?.['raster-brightness-min']).toBeGreaterThan(0)
  expect(rasterPaint('states', layer)?.['raster-saturation']).toBeLessThan(0)
  expect(rasterPaint('rivers', layer)?.['raster-opacity']).toBeLessThan(1)
})

it('differentiates settlement classes without inventing capital status', () => {
  const sizes = [78, 800, 5200].map(population => settlementRadius({ population }))
  expect(sizes[0]).toBeLessThan(sizes[1])
  expect(sizes[1]).toBeLessThan(sizes[2])
  expect(settlementRadius({ population: 800, settlementClass: 'capital' })).toBeGreaterThan(sizes[2])
})

it('keeps annotations clear of a marker without moving the native label anchor', () => {
  const base = labelOffsets()
  const annotated = labelOffsets({ left: 1.2, right: 0.8, top: 0.5, bottom: 1.6 })
  expect((annotated[1] as number[])[0] - (base[1] as number[])[0]).toBeCloseTo(1.2)
  expect((base.at(-1) as number[])[1] - (annotated.at(-1) as number[])[1]).toBeCloseTo(1.6)
})

it('samples transparent boundary strokes and land edges in Mercator coordinates', () => {
  const pixels = new Uint8ClampedArray(12 * 12 * 4)
  for (let y = 1; y < 11; y++) for (let x = 4; x < 9; x++) pixels[(y * 12 + x) * 4 + 3] = 255
  const bounds: [[number, number], [number, number]] = [[60, -10], [40, 10]]
  const fill = boundaryPoints(pixels, 12, 12, bounds, false)
  const edge = boundaryPoints(pixels, 12, 12, bounds, true)
  expect(edge.features.length).toBeGreaterThan(0)
  expect(edge.features.length).toBeLessThan(fill.features.length)
  for (const feature of edge.features) {
    const [lon, lat] = feature.geometry.coordinates
    expect(lon).toBeGreaterThan(-10); expect(lon).toBeLessThan(10)
    expect(lat).toBeGreaterThan(40); expect(lat).toBeLessThan(60)
  }
  expect(boundaryPoints(new Uint8ClampedArray(12 * 12 * 4), 12, 12, bounds, false).features).toEqual([])
})
