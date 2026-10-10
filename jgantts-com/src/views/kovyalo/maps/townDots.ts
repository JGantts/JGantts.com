import type { Map as MapLibreMap } from 'maplibre-gl'

// Circle layers do not participate in symbol collisions. Follow the labels
// actually placed by MapLibre, not just the towns eligible at this zoom.
export function syncOverviewTownDots(map: MapLibreMap) {
  let previous = ''
  const sync = () => {
    if (!map.getLayer('towns-layer') || !map.getLayer('town-dots')) return
    const zoom = Math.floor(map.getZoom())
    const ids = [...new Set(map.queryRenderedFeatures({ layers: ['towns-layer'] })
      .filter(feature => feature.properties.regionMinZoom > zoom)
      .map(feature => feature.id)
      .filter((id): id is number => typeof id === 'number'))].sort((a, b) => a - b)
    const key = JSON.stringify(ids)
    if (key === previous) return
    previous = key
    map.setFilter('town-dots', ['any',
      ['>=', ['zoom'], ['get', 'regionMinZoom']],
      ['in', ['id'], ['literal', ids]],
    ])
  }
  map.on('render', sync)
  map.once('remove', () => map.off('render', sync))
}
