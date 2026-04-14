<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue'
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const props = defineProps<{ dev?: boolean }>()

type BoundsTuple = [[number, number], [number, number]]

type RegionLayerConfig = {
  id: string
  imageUrl: string
}

type DataSourceKind = 'towns-large'

type RegionConfig = {
  id: string
  title: string
  bounds: BoundsTuple
  minZoom: number
  maxZoom: number
  parentId?: string | null
  layers: RegionLayerConfig[]
  dataSources?: {
    kind: DataSourceKind
    points: { name: string; coordinates: [number, number] }[]
  }[]
}

type ManagedRegion = RegionConfig & { active: boolean }

type ImageCoordinates = [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
]

const mapEl = ref<HTMLElement | null>(null)
let map: MapLibreMap | null = null

const cursorCoords = ref<{ x: number; y: number } | null>(null)
const zoomCurrent = ref(0)

const regionOverlayOpacity = computed(() => (props.dev ? 0.5 : 1))
const regions = shallowRef<ManagedRegion[]>([])

const polarExtents = 85.05113

const worldBounds: BoundsTuple = [
  [-polarExtents, -180],
  [polarExtents, 180],
]

const regionConfigs: RegionConfig[] = [
  {
    id: 'kovyalo',
    title: 'Kovyálo',
    bounds: [
      [14.596875, -49.32],
      [-3.645, -22.68],
    ],
    minZoom: -30,
    maxZoom: 12,
    parentId: null,
    layers: [
      { id: 'background', imageUrl: '/assets/kovyalo/map/kovyalo/background.png' },
      { id: 'base', imageUrl: '/assets/kovyalo/map/kovyalo/0.png' },
    ],
  },
  {
    id: 'ziemund',
    title: 'Ziemúnd',
    bounds: [
      [9.084375, -36.6552],
      [14.54625, -32.5872],
    ],
    minZoom: -1.5,
    maxZoom: 24,
    parentId: 'kovyalo',
    layers: [
      { id: 'background', imageUrl: '/assets/kovyalo/map/kovyalo/ziemund/background.png' },
      { id: 'base', imageUrl: '/assets/kovyalo/map/kovyalo/ziemund/0.png' },
    ],
    dataSources: [
      {
        kind: 'towns-large',
        points: [
          { name: 'Roçyáboe', coordinates: [-32.95, 9.76] },
          { name: 'Embua', coordinates: [-34.39, 11.85] },
        ],
      },
    ],
  },
]

const warpedImageUrlCache = new Map<string, Promise<string>>()

function normalizeBounds(bounds: BoundsTuple): BoundsTuple {
  const [[y1, x1], [y2, x2]] = bounds
  return [
    [Math.max(y1, y2), Math.min(x1, x2)],
    [Math.min(y1, y2), Math.max(x1, x2)],
  ]
}

function boundsToImageCoordinates(bounds: BoundsTuple): ImageCoordinates {
  const [[top, left], [bottom, right]] = normalizeBounds(bounds)
  return [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ]
}

function getRegionById(id: string | null | undefined): ManagedRegion | undefined {
  if (!id) return undefined
  return regions.value.find((r) => r.id === id)
}

function isRegionInView(region: RegionConfig): boolean {
  if (!map) return false

  const screenBounds = map.getBounds()
  const [[regionTop, regionLeft], [regionBottom, regionRight]] = normalizeBounds(region.bounds)

  const center = map.getCenter()

  return !(
    regionRight < screenBounds.getWest() ||
    regionLeft > screenBounds.getEast() ||
    regionBottom > screenBounds.getNorth() ||
    regionTop < screenBounds.getSouth()
  ) || (
    center.lat >= regionBottom &&
    center.lat <= regionTop &&
    center.lng >= regionLeft &&
    center.lng <= regionRight
  )
}

function shouldRegionBackgroundBeVisible(region: RegionConfig): boolean {
  if (!map) return false

  const screenBounds = map.getBounds()
  const [[regionTop, regionLeft], [regionBottom, regionRight]] = normalizeBounds(region.bounds)

  const percentageOfScreenMin = 0.75
  const percentageOfScreenMax = 1.50

  const regionWidthIsLargeEnoughComparedToScreen = () => { return (
    (regionRight - regionLeft) > (screenBounds.getEast() - screenBounds.getWest() * percentageOfScreenMin)
  ) }

  const regionHeightIsLargeEnoughComparedToScreen = () => { return (
    (regionTop - regionBottom) > (screenBounds.getNorth() - screenBounds.getSouth() * percentageOfScreenMin)
  ) }
  
  const regionWidthIsToLargeComparedToScreen = () => { return (
    (regionRight - regionLeft) > (screenBounds.getEast() - screenBounds.getWest() * percentageOfScreenMax)
  ) }

  const regionHeightIsToLargeComparedToScreen = () => { return (
    (regionTop - regionBottom) > (screenBounds.getNorth() - screenBounds.getSouth() * percentageOfScreenMax)
  ) }

  if (regionWidthIsLargeEnoughComparedToScreen() && !regionWidthIsToLargeComparedToScreen()) return true
  if (regionHeightIsLargeEnoughComparedToScreen() && !regionHeightIsToLargeComparedToScreen()) return true

  return false
}

let syncScheduled = false

function requestSync() {
  if (syncScheduled) return
  syncScheduled = true

  function syncRegions(): void {
    if (!map) return

    const directlyEligible = regions.value.filter(isRegionInView)
    const visibleIds = new Set(directlyEligible.map((r) => r.id))

    for (const region of directlyEligible) {
      let parentId = region.parentId

      while (parentId) {
        visibleIds.add(parentId)
        parentId = getRegionById(parentId)?.parentId ?? null
      }
    }

    for (const region of regions.value) {
      const shouldBeVisible = visibleIds.has(region.id)
      region.active = shouldBeVisible

      const backgroundShouldBeVisible = shouldRegionBackgroundBeVisible(region)

      for (const layer of region.layers) {
        const layerId = `region-${region.id}-${layer.id}`

        if (!map.getLayer(layerId)) continue

        if (layer.id === 'background' && !backgroundShouldBeVisible) {
          map.setPaintProperty(
            `region-${region.id}-${layer.id}`,
            'raster-opacity',
            0,
          )
          continue
        }

        const opacity = shouldBeVisible
          ? regionOverlayOpacity.value
          : 0

        map.setPaintProperty(layerId, 'raster-opacity', opacity)
      }
    }
  }

  requestAnimationFrame(() => {
    syncScheduled = false
    syncRegions()
  })
}



function remapEquirectToMercator(
  srcCtx: CanvasRenderingContext2D,
  dstCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const srcImage = srcCtx.getImageData(0, 0, width, height)
  const dstImage = dstCtx.createImageData(width, height)

  const src = srcImage.data
  const dst = dstImage.data

  const maxLat = polarExtents
  const maxMerc = Math.log(Math.tan(Math.PI / 4 + (maxLat * Math.PI / 180) / 2))

  function mercatorVToSourceY(vMerc: number): number {
    const yMerc = (1 - 2 * vMerc) * maxMerc
    const latRad = 2 * Math.atan(Math.exp(yMerc)) - Math.PI / 2
    const latDeg = (latRad * 180) / Math.PI
    const vEq = (90 - latDeg) / 180
    return vEq * (height - 1)
  }

  for (let y = 0; y < height; y++) {
    const vMerc = y / (height - 1)
    const srcY = mercatorVToSourceY(vMerc)
    const y0 = Math.floor(srcY)
    const y1 = Math.min(y0 + 1, height - 1)
    const t = srcY - y0

    for (let x = 0; x < width; x++) {
      const iDst = (y * width + x) * 4
      const i0 = (y0 * width + x) * 4
      const i1 = (y1 * width + x) * 4

      for (let c = 0; c < 4; c++) {
        dst[iDst + c] = Math.round(src[i0 + c] * (1 - t) + src[i1 + c] * t)
      }
    }
  }

  dstCtx.putImageData(dstImage, 0, 0)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

async function createMercatorWarpedImageUrl(url: string): Promise<string> {
  const cached = warpedImageUrlCache.get(url)
  if (cached) return cached

  const promise = (async () => {
    const img = await loadImage(url)

    const srcCanvas = document.createElement('canvas')
    srcCanvas.width = img.width
    srcCanvas.height = img.height

    const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true })
    if (!srcCtx) {
      throw new Error(`Could not get 2D context for source canvas: ${url}`)
    }

    srcCtx.drawImage(img, 0, 0)

    const dstCanvas = document.createElement('canvas')
    dstCanvas.width = img.width
    dstCanvas.height = img.height

    const dstCtx = dstCanvas.getContext('2d')
    if (!dstCtx) {
      throw new Error(`Could not get 2D context for destination canvas: ${url}`)
    }

    remapEquirectToMercator(srcCtx, dstCtx, img.width, img.height)

    return dstCanvas.toDataURL('image/png')
  })()

  warpedImageUrlCache.set(url, promise)
  return promise
}

async function addWarpedImageSource(
  sourceId: string,
  imageUrl: string,
  bounds: BoundsTuple,
): Promise<void> {
  if (!map) return

  const warpedUrl = await createMercatorWarpedImageUrl(imageUrl)

  map.addSource(sourceId, {
    type: 'image',
    url: warpedUrl,
    coordinates: boundsToImageCoordinates(bounds),
  })
}

onMounted(() => {
  if (!mapEl.value) return

  map = new maplibregl.Map({
    container: mapEl.value,
    style: { version: 8, sources: {}, layers: [] },
    center: [0, 0],
    zoom: 3,
    minZoom: 2,
    maxZoom: 12,
    attributionControl: false,
    renderWorldCopies: false,
  })

  map.on('style.load', () => {
    map!.setProjection({ type: 'globe' })
  })

  map.on('load', async () => {
    try {
      await addWarpedImageSource(
        'world-lowrez',
        '/assets/kovyalo/map/0-lowrez.png',
        worldBounds,
      )

      map!.addLayer({
        id: 'world-lowrez',
        type: 'raster',
        source: 'world-lowrez',
        paint: {
          'raster-opacity': 1,
          'raster-fade-duration': 0,
        },
      })

      await addWarpedImageSource(
        'world',
        '/assets/kovyalo/map/0.png',
        worldBounds,
      )

      map!.addLayer({
        id: 'world',
        type: 'raster',
        source: 'world',
        paint: {
          'raster-opacity': 1,
          'raster-fade-duration': 0,
        },
      })

      function onHighResReady() {
        map = map!
        map.setPaintProperty('world-high', 'raster-opacity', 1)
        map.setPaintProperty('world-low', 'raster-opacity', 0)

        setTimeout(() => {
          map = map!
          map.removeLayer('world-low')
          map.removeSource('world-low')
        }, 300) // match fade duration
      }

      // =========================
      // RASTER REGIONS (unchanged)
      // =========================
      for (const config of regionConfigs) {
        const region: ManagedRegion = {
          ...config,
          bounds: normalizeBounds(config.bounds),
          active: false,
        }

        for (const layer of region.layers) {
          const sourceId = `region-src-${region.id}-${layer.id}`
          const layerId = `region-${region.id}-${layer.id}`

          map!.addSource(sourceId, {
            type: 'image',
            url: layer.imageUrl,
            coordinates: boundsToImageCoordinates(region.bounds),
          })

          map!.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-opacity': 1,
            },
          })
        }

        regions.value.push(region)
      }

      // =========================
      // BUILD LABEL DATA (NEW)
      // =========================
      const regionLabels: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
      }

      const townsLarge: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
      }

      for (const region of regions.value) {
        const b = normalizeBounds(region.bounds)

        // region label
        regionLabels.features.push({
          type: 'Feature',
          properties: {
            name: region.title,
            priority: 1,
          },
          geometry: {
            type: 'Point',
            coordinates: [
              b[0][1] + (b[1][1] - b[0][1]) / 2,
              b[0][0] + (b[1][0] - b[0][0]) / 2,
            ],
          },
        })

        // towns
        for (const ds of region.dataSources ?? []) {
          if (ds.kind === 'towns-large') {
            for (const p of ds.points) {
              townsLarge.features.push({
                type: 'Feature',
                properties: {
                  name: p.name,
                  priority: 10,
                },
                geometry: {
                  type: 'Point',
                  coordinates: p.coordinates,
                },
              })
            }
          }
        }
      }

      // =========================
      // SOURCES (ONCE)
      // =========================
      map!.addSource('regions-labels', {
        type: 'geojson',
        data: regionLabels,
      })

      map!.addSource('towns-large', {
        type: 'geojson',
        data: townsLarge,
      })

      // =========================
      // LAYERS (ORDER = PRIORITY)
      // =========================

      // regions (low priority)
      map!.addLayer({
        id: 'regions-labels-layer',
        type: 'symbol',
        source: 'regions-labels',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': [
            'interpolate', ['linear'], ['zoom'],
            2, 12,
            6, 18,
            10, 32,
            14, 64
          ],
          'text-variable-anchor': ['center', 'top', 'bottom', 'left', 'right'],
          'text-radial-offset': 0.5,
          'text-justify': 'auto',
          'symbol-sort-key': ['get', 'priority'],
        },
        paint: {
          'text-color': '#fff',
          'text-halo-color': '#000',
          'text-halo-width': 2,
        },
      })

      // towns (high priority)
      map!.addLayer({
        id: 'towns-large-layer',
        type: 'symbol',
        source: 'towns-large',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': [
            'interpolate', ['linear'], ['zoom'],
            2, 8,
            6, 14,
            10, 24,
            14, 40
          ],
          'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
          'text-radial-offset': 0.6,
          'text-justify': 'auto',
          'symbol-sort-key': ['get', 'priority'],
        },
        paint: {
          'text-color': '#fff',
          'text-halo-color': '#000',
          'text-halo-width': 2,
        },
      })
      requestSync()
    } catch (error) {
      console.error('Failed to initialize map sources:', error)
    }
  })

  function updateMouseOnMove(e: maplibregl.MapMouseEvent|null) {
    if (!e) return
    e = e!
    cursorCoords.value = {
      x: e.lngLat.lng,
      y: e.lngLat.lat,
    }
  }

  function updateOnZoom() {
    zoomCurrent.value = map!.getZoom()
  }

  map.on('mousemove', (e) => {
    updateMouseOnMove(e)
    requestSync()
  })

  map!.on('zoom', () => {
    updateOnZoom()
    requestSync()
  })

  updateMouseOnMove(null)
  updateOnZoom()
  requestSync()

})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
    <div v-if="props.dev" class="toolbar">

    <div>
      {{
        cursorCoords
          ? `Cursor: (x: ${cursorCoords.x.toFixed(4)}, y: ${cursorCoords.y.toFixed(4)})`
          : 'Move cursor over map'
      }}
    </div>

    <div>
      Zoom: {{ zoomCurrent.toFixed(2) }}
    </div>
  </div>
  <div class="fantasy-map-root">
    <div ref="mapEl" class="fantasy-map" />
  </div>
</template>

<style scoped>
.fantasy-map-root {
  width: 100vw;
  height: 100vh;
}
.fantasy-map {
  width: 100%;
  height: 100%;
  background: #111;
}
</style>