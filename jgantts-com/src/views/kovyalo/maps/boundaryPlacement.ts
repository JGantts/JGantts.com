import type { Feature, FeatureCollection, LineString, Point } from 'geojson'
import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl'
import { labelOffsets, townLabelSize, townTextSize, type LabelMode, type LabelOffsets } from './townLabels'
import type { BoundsTuple } from './types/maps'
import { cartography } from './cartography'

// Sample the displayed raster, not a second interpretation of the geography.
// Generated single-image layers are in Web Mercator, so interpolate Mercator Y.
export function boundaryPoints(pixels: Uint8ClampedArray, width: number, height: number,
  bounds: BoundsTuple, edgeOnly: boolean): FeatureCollection<Point> {
  const north = Math.max(bounds[0][0], bounds[1][0])
  const south = Math.min(bounds[0][0], bounds[1][0])
  const west = Math.min(bounds[0][1], bounds[1][1])
  const east = Math.max(bounds[0][1], bounds[1][1])
  const mercator = (lat: number) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))
  const top = mercator(north), bottom = mercator(south)
  const alpha = (x: number, y: number) => pixels[(y * width + x) * 4 + 3]
  const features: FeatureCollection<Point>['features'] = []
  for (let y = 1; y < height - 2; y += 2) {
    for (let x = 1; x < width - 2; x += 2) {
      let hit = false
      for (let dy = 0; dy < 2 && !hit; dy++) for (let dx = 0; dx < 2 && !hit; dx++) {
        const px = x + dx, py = y + dy
        hit = alpha(px, py) > 32 && (!edgeOnly ||
          [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([ox, oy]) => alpha(px + ox, py + oy) <= 32))
      }
      if (!hit) continue
      const fy = (y + 1) / height
      features.push({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [
        west + (x + 1) / width * (east - west),
        Math.atan(Math.sinh(top + fy * (bottom - top))) * 180 / Math.PI,
      ] } })
    }
  }
  return { type: 'FeatureCollection', features }
}

type Boundary = { layerId: string; points?: FeatureCollection<Point>; lines?: Feature<LineString>[]; weight: number }
const boundaries = new WeakMap<MapLibreMap, Boundary[]>()
const placements = new WeakMap<MapLibreMap, () => void>()

export async function loadBoundaryRaster(map: MapLibreMap, id: string, url: string,
  bounds: BoundsTuple, minzoom: number, maxzoom: number, metadata: object, edgeOnly = false, signal?: AbortSignal) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Boundary raster ${url}: ${response.status}`)
  const bitmap = await createImageBitmap(await response.blob())
  if (signal?.aborted) { bitmap.close(); signal.throwIfAborted() }
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const entry = { layerId: id, points: boundaryPoints(pixels.data, canvas.width, canvas.height, bounds, edgeOnly), weight: edgeOnly ? 3 : 1 }
  boundaries.set(map, [...(boundaries.get(map) ?? []), entry])
  if (!edgeOnly) {
    const casing = document.createElement('canvas')
    casing.width = canvas.width; casing.height = canvas.height
    const halo = casing.getContext('2d')!
    halo.shadowColor = '#fff'; halo.shadowBlur = cartography.borders.casingBlur
    halo.drawImage(canvas, 0, 0)
    const sourceId = `${id}-casing`
    const [[north, west], [south, east]] = bounds
    map.addSource(sourceId, { type: 'canvas', canvas: casing, animate: false,
      coordinates: [[west, north], [east, north], [east, south], [west, south]] })
    map.addLayer({ id: sourceId, type: 'raster', source: sourceId, minzoom, maxzoom, metadata,
      layout: { visibility: 'none' },
      paint: { 'raster-brightness-min': 1, 'raster-opacity': ['interpolate', ['linear'], ['zoom'],
        minzoom, cartography.borders.casingOpacity * 0.6, maxzoom, cartography.borders.casingOpacity] },
    }, id)
  }
}

export function registerBoundaryLines(map: MapLibreMap, layerId: string, lines: Feature<LineString>[], weight: number) {
  boundaries.set(map, [...(boundaries.get(map) ?? []), { layerId, lines, weight }])
}

export function refreshBoundaryPlacement(map: MapLibreMap) {
  placements.get(map)?.()
}

export function installBoundaryPlacement(map: MapLibreMap, towns: FeatureCollection, mode: () => LabelMode) {
  const refresh = () => {
    const size = townLabelSize(map.getContainer().clientWidth, map.getContainer().clientHeight)
    const zoom = map.getZoom()
    const points = (boundaries.get(map) ?? []).filter(({ layerId }) => {
      const layer = map.getLayer(layerId)
      return layer && map.getLayoutProperty(layerId, 'visibility') !== 'none'
        && zoom >= (layer.minzoom ?? 0) && zoom < (layer.maxzoom ?? 24)
    }).flatMap(boundary => {
      const samples = (boundary.points?.features ?? []).map(feature => ({
        ...map.project(feature.geometry.coordinates as [number, number]), weight: boundary.weight,
      }))
      for (const line of boundary.lines ?? []) {
        const projected = line.geometry.coordinates.map(coordinate => map.project(coordinate as [number, number]))
        for (let i = 1; i < projected.length; i++) {
          const a = projected[i - 1], b = projected[i]
          const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8))
          for (let j = 0; j <= steps; j++) samples.push({
            x: a.x + (b.x - a.x) * j / steps, y: a.y + (b.y - a.y) * j / steps, weight: boundary.weight,
          })
        }
      }
      return samples
    })
    // A small screen-space grid keeps camera updates cheap even for detailed masks.
    const cell = 32
    const grid = new Map<string, { x: number; y: number; weight: number }[]>()
    for (const point of points) {
      const key = `${Math.floor(point.x / cell)},${Math.floor(point.y / cell)}`
      const bucket = grid.get(key) ?? []
      bucket.push(point); grid.set(key, bucket)
    }
    const count = (left: number, top: number, right: number, bottom: number) => {
      let hits = 0
      for (let y = Math.floor(top / cell); y <= Math.floor(bottom / cell); y++) {
        for (let x = Math.floor(left / cell); x <= Math.floor(right / cell); x++) {
          for (const point of grid.get(`${x},${y}`) ?? []) {
            if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) hits += point.weight
          }
        }
      }
      return hits
    }
    const cases: unknown[] = []
    for (const feature of towns.features) {
      if (feature.geometry.type !== 'Point') continue
      const imageId = feature.properties?.[`${mode()}Image`]
      const image = imageId && map.getImage(imageId)
      if (!image?.content) continue
      const scale = size / townTextSize / image.pixelRatio
      const [x1, y1, x2, y2] = image.content
      const width = (x2 - x1) * scale, height = (y2 - y1) * scale
      const overhang = { left: x1 * scale, right: (image.data.width - x2) * scale,
        top: y1 * scale, bottom: (image.data.height - y2) * scale }
      const offsets = labelOffsets({ left: overhang.left / size, right: overhang.right / size,
        top: overhang.top / size, bottom: overhang.bottom / size })
      const point = map.project(feature.geometry.coordinates as [number, number])
      const candidates = []
      for (let i = 0; i < offsets.length; i += 2) {
        const anchor = offsets[i] as string
        const [dx, dy] = offsets[i + 1] as [number, number]
        const ax = anchor.includes('left') ? 0 : anchor.includes('right') ? 1 : 0.5
        const ay = anchor.includes('top') ? 0 : anchor.includes('bottom') ? 1 : 0.5
        const left = point.x + dx * size - ax * width - overhang.left
        const top = point.y + dy * size - ay * height - overhang.top
        const gap = cartography.labels.boundaryClearance
        const hits = count(left - gap, top - gap, left + width + overhang.left + overhang.right + gap,
          top + height + overhang.top + overhang.bottom + gap)
        candidates.push({ anchor, offset: [dx, dy] as [number, number], hits })
      }
      // Prefer clear positions, but don't erase a border settlement's name when
      // every nearby position crosses a boundary. Then choose the least overlap.
      candidates.sort((a, b) => a.hits - b.hits)
      const ordered: LabelOffsets = candidates.flatMap(candidate => [candidate.anchor, candidate.offset])
      cases.push(feature.id, ['literal', ordered])
    }
    if (!cases.length) return
    const expression = ['match', ['id'], ...cases, ['literal', labelOffsets()]] as ExpressionSpecification
    const key = JSON.stringify(expression)
    if (JSON.stringify(map.getLayoutProperty('towns-layer', 'text-variable-anchor-offset')) === key) return
    map.setLayoutProperty('towns-layer', 'text-variable-anchor-offset', expression)
  }
  placements.set(map, refresh)
  map.on('moveend', refresh)
  map.on('resize', refresh)
  map.once('remove', () => {
    map.off('moveend', refresh); map.off('resize', refresh)
    placements.delete(map); boundaries.delete(map)
  })
  refresh()
}
