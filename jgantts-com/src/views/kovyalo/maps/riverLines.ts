import type { FeatureCollection, LineString } from 'geojson'
import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl'
import { cartography } from './cartography'

type RiverData = FeatureCollection<LineString> & { hydrology: { maximumDisplayAreaKm2: number } }

export function riverWidth(maximumArea: number): ExpressionSpecification {
  const style = cartography.rivers
  return ['+', style.minimumWidth, ['*', style.maximumWidth - style.minimumWidth,
    ['^', ['min', 1, ['max', 0, ['/', ['get', 'displayAreaKm2'], Math.max(1, maximumArea)]]], style.areaExponent]]]
}

export async function addRiverLines(map: MapLibreMap, id: string, url: string,
  minzoom: number, maxzoom: number, metadata: object, beforeId: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`River network ${url}: ${response.status}`)
  const data = await response.json() as RiverData
  const maximum = data.hydrology.maximumDisplayAreaKm2
  const style = cartography.rivers
  const width = riverWidth(maximum)
  const overviewDetail: ExpressionSpecification = ['interpolate', ['linear'], ['get', 'displayAreaKm2'],
    0, style.minorWidthScale, maximum * style.majorAreaFraction, 1]
  signal?.throwIfAborted()
  map.addSource(id, { type: 'geojson', data, tolerance: 0 })
  map.addLayer({ id, type: 'line', source: id, minzoom, maxzoom, metadata,
    layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': style.color,
      'line-width': ['interpolate', ['linear'], ['zoom'],
        minzoom, ['*', style.overviewScale, overviewDetail, width],
        Math.min((minzoom + maxzoom) / 2, minzoom + 2), width,
        maxzoom, ['*', style.detailScale, width]],
      'line-opacity': style.opacity,
    },
  }, beforeId)
}
