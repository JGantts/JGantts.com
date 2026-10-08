import type { Map as MapLibreMap } from 'maplibre-gl'
import type { RegionConfig } from './types/maps'
import { townNameProperties } from './rubyLabels'
import { townFonts, townLabel, townLabelImage, type LabelMode } from './townLabels'

export const regionLabelId = (id: string) => `region-label-${id}`
export const regionTitle = (region: RegionConfig) =>
  typeof region.title === 'string' ? { native: region.title } : region.title

export function addRegionLabels(map: MapLibreMap, regions: RegionConfig[], mode: LabelMode) {
  for (const region of regions) {
    const title = regionTitle(region)
    if (region.id === 'world' || !title?.native || !region.bounds) continue
    const [[north, west], [south, east]] = region.bounds
    const zoom = 'display' in region.zoom ? region.zoom.display : region.zoom
    const id = regionLabelId(region.id)
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: region.labelCoordinates ?? [(west + east) / 2, (north + south) / 2] },
        properties: townNameProperties(map, title.native, title.hangul, title.latin),
      },
    })
    map.addLayer({
      id, type: 'symbol', source: id,
      minzoom: Math.max(0, zoom.min - 2), maxzoom: zoom.max,
      layout: {
        'text-field': townLabel(mode), 'text-font': townFonts,
        'text-size': ['interpolate', ['linear'], ['zoom'], Math.max(0, zoom.min - 2), 32, Math.max(0, zoom.min - 2) + 2, 24],
        'text-line-height': 1, 'text-max-width': 1000,
        'icon-image': townLabelImage(mode), 'icon-text-fit': 'both',
        'icon-padding': 12, 'icon-allow-overlap': false,
      },
      paint: { 'text-opacity': 0 },
    })
  }
}
