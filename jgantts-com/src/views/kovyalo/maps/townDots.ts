import type { Map as MapLibreMap } from 'maplibre-gl'

// Overview dots follow placed names. Detailed dots follow marker footprints;
// these reserve space for labels and suppress only markers too close to separate.
export function syncOverviewTownDots(map: MapLibreMap) {
  let previous = ''
  const sync = () => {
    if (!map.getLayer('towns-layer') || !map.getLayer('town-dots')) return
    const zoom = Math.floor(map.getZoom())
    const ids = [...new Set(map.queryRenderedFeatures({ layers: ['towns-layer'] })
      .filter(feature => feature.properties.regionMinZoom > zoom)
      .map(feature => feature.id)
      .filter((id): id is number => typeof id === 'number'))].sort((a, b) => a - b)
    const markerIds = [...new Set(map.queryRenderedFeatures({ layers: ['town-marker-obstacles'] })
      .map(feature => feature.id).filter((id): id is number => typeof id === 'number'))].sort((a, b) => a - b)
    const key = JSON.stringify([ids, markerIds])
    if (key === previous) return
    previous = key
    map.setFilter('town-dots', ['any',
      ['in', ['id'], ['literal', markerIds]],
      ['in', ['id'], ['literal', ids]],
    ])
    map.setFilter('towns-layer', ['all',
      ['>=', ['zoom'], ['get', 'labelMinZoom']],
      ['any', ['<', ['zoom'], ['get', 'regionMinZoom']], ['in', ['id'], ['literal', markerIds]]],
    ])
  }
  // Symbol placement and worker tile data can belong to different frames while
  // zooming or changing label images. Query only a settled placement, then let
  // the changed filters produce the next frame before querying again.
  map.on('idle', sync)
  map.once('remove', () => map.off('idle', sync))
}
