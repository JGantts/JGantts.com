// Static imports let Vite keep dependency versions consistent during hot reloads.
export { initMap } from '../../../src/views/kovyalo/maps/maps'
export { initMapSourcesAndLayers } from '../../../src/views/kovyalo/maps/initSources'
export { loadBoundaryRaster, refreshBoundaryPlacement } from '../../../src/views/kovyalo/maps/boundaryPlacement'
export { useSettings } from '../../../src/views/kovyalo/common/Settings'

export function waitForMapIdle(map: import('maplibre-gl').Map) {
  return new Promise<void>(resolve => {
    const settled = () => {
      // Idle listeners may update marker filters before this listener runs.
      if (!map.loaded()) return
      map.off('idle', settled)
      resolve()
    }
    map.on('idle', settled)
    // Request a frame even if the camera/style change was a no-op.
    map.triggerRepaint()
  })
}
