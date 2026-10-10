import type { FeatureCollection, LineString } from 'geojson'
import type { FilterSpecification, Map as MapLibreMap } from 'maplibre-gl'
import { cartography } from './cartography'
import { registerBoundaryLines } from './boundaryPlacement'

export async function addPoliticalBoundaries(map: MapLibreMap, id: string, url: string,
  minzoom: number, maxzoom: number, metadata: object) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Classified boundaries ${url}: ${response.status}`)
  const data = await response.json() as FeatureCollection<LineString>
  map.addSource(id, { type: 'geojson', data })
  for (const kind of ['county', 'provincial', 'national'] as const) {
    const style = cartography.borders.classes[kind]
    const layerId = kind === 'national' ? id : `${id}-${kind}`
    const filter: FilterSpecification = ['==', ['get', 'boundaryType'], kind]
    if (kind !== 'county') map.addLayer({
      id: `${layerId}-casing`, type: 'line', source: id, minzoom, maxzoom, metadata,
      filter, layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#eee8db', 'line-opacity': cartography.borders.casingOpacity,
        'line-width': ['interpolate', ['linear'], ['zoom'], minzoom, style.width[0] + 0.8, maxzoom, style.width[1] + 1],
      },
    }, 'town-dots')
    map.addLayer({
      id: layerId, type: 'line', source: id, minzoom, maxzoom, metadata,
      filter, layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': style.color,
        'line-opacity': ['interpolate', ['linear'], ['zoom'], minzoom, style.opacity[0], maxzoom, style.opacity[1]],
        'line-width': ['interpolate', ['linear'], ['zoom'], minzoom, style.width[0], maxzoom, style.width[1]],
      },
    }, 'town-dots')
    registerBoundaryLines(map, layerId, data.features.filter(feature => feature.properties?.boundaryType === kind), style.clearanceWeight)
  }
}
