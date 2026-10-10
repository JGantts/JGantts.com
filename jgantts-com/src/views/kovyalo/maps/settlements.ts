import type { CircleLayerSpecification, ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl'
import type { Town } from './types/maps'
import { cartography } from './cartography'

export function settlementRadius(town: Pick<Town, 'population' | 'settlementClass'>): number {
  const style = cartography.settlements
  const kind = town.settlementClass ?? (town.population >= style.cityPopulation ? 'city'
    : town.population >= style.townPopulation ? 'town' : 'village')
  return style[`${kind}Radius`]
}

export const markerRadius: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'],
  5, ['*', 0.8, ['get', 'markerRadius']], 10, ['get', 'markerRadius']]

export const markerPaint: CircleLayerSpecification['paint'] = {
  'circle-color': '#fff', 'circle-stroke-color': '#111',
  'circle-radius': markerRadius,
  'circle-stroke-width': cartography.settlements.outline,
}

// A transparent symbol reserves the marker's footprint in MapLibre's collision
// index. The circles then follow the symbols that actually fit, in population
// order, so tightly packed settlements don't turn into an unreadable white blob.
export function addTownMarkerObstacles(map: MapLibreMap) {
  map.addImage('town-marker-footprint', { width: 2, height: 2, data: new Uint8Array(16) })
  map.addLayer({
    id: 'town-marker-obstacles', type: 'symbol', source: 'towns',
    filter: ['all', ['>=', ['zoom'], ['get', 'regionMinZoom']], ['>=', ['zoom'], ['get', 'labelMinZoom']]],
    layout: {
      'icon-image': 'town-marker-footprint',
      'icon-size': ['interpolate', ['linear'], ['zoom'],
        5, ['+', ['*', 0.8, ['get', 'markerRadius']], cartography.settlements.outline],
        10, ['+', ['get', 'markerRadius'], cartography.settlements.outline]],
      'icon-padding': cartography.settlements.spacing,
      'icon-allow-overlap': false, 'icon-ignore-placement': false,
      'symbol-sort-key': ['-', ['get', 'markerPriority']],
    },
  })
}
