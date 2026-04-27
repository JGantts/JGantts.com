<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import KDBush from 'kdbush';
import { Protocol } from 'pmtiles'
import CompassView from './CompassView.vue'

const props = defineProps<{ dev?: boolean }>()

const SAVE_KEY = 'fantasy-map-state'

type MapSaveState = {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
}

type BoundsTuple = [[number, number], [number, number]]

type RegionLayerConfig = {
  id: string
  imageUrl: string
}

type DataSourceKind = 'towns'

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
    points: { name: string; coordinates: [number, number], population: number }[]
  }[]
}

type ManagedRegion = RegionConfig & { active: boolean, townsActive: boolean }

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
const pitchCurrent = ref(0)
const bearingCurrent = ref(0)

const regionOverlayOpacity = computed(() => (props.dev ? 0.5 : 1))
const regions = shallowRef<ManagedRegion[]>([])

const polarExtents = 85.05113

const worldBounds: BoundsTuple = [
  [-polarExtents, -180],
  [polarExtents, 180],
]

type Town = {
  name: string
  coordinates: [number, number]
  population: number
}

type TownPlusRegion = Town & { regionId: string }

const regionConfigs = shallowRef<RegionConfig[]>([])

const townIndex = shallowRef<KDBush>()
const allTowns = shallowRef<TownPlusRegion[]>([])

const mapReady: Ref<boolean> = ref(false)

async function initMapData() {
  regionConfigs.value = JSON.parse(
    await (await fetch('/assets/kovyalo/geo-data/regions.json')).text()
  ) as RegionConfig[]

  allTowns.value = regionConfigs.value.reduce<TownPlusRegion[]>(
  (prev, curr) => {
    return [
      ...prev,
      ...((curr.dataSources ?? []).reduce<TownPlusRegion[]>((acc, d) => {
        if (d.kind === 'towns') acc.push(...d.points.map(town => { 
          return {
            name: town.name,
            coordinates: town.coordinates,
            population: town.population,
            regionId: curr.id,
          };
        }))
        return acc
      }, []))
    ]
  },
  []
)

townIndex.value = new KDBush(allTowns.value.length)

for (const town of allTowns.value) {
  const [lat, lng] = town.coordinates
  townIndex.value.add(lat, lng)
}

townIndex.value.finish()
}


function getVisibleTownsInActiveRegions(bounds: maplibregl.LngLatBounds) {
  if (!townIndex.value) return []

  const foundIds = townIndex.value.range(bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth());

  const foundItems = foundIds.map(i => allTowns.value[i]);

  const visibleTowns = foundItems.filter(town => {
    return getRegionById(town.regionId)?.townsActive
  })

  const visiblePopulation = computeVisiblePopulation(visibleTowns)

  const activeTowns = visibleTowns.map(town => ({
    ...town,
    popTemp: town.population / visiblePopulation
  })).filter(town => town.popTemp > 0.01)

  return visibleTowns
}

function computeVisiblePopulation(visibleTowns: TownPlusRegion[]|null = null) {
  if (!map) return 1

  const bounds = map.getBounds()
  const towns = visibleTowns || getVisibleTownsInActiveRegions(bounds)

  let total = 0
  for (const t of towns) {
    total += t.population
  }

  return total || 1
}

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
  const [[regionTop, regionLeft], [regionBottom, regionRight]] = region.bounds

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

const regionPercentMin: number = 0.6
const regionPercentMax: number = 1.4

function isRegionWideEnoughToShow(region: RegionConfig, screenBounds: maplibregl.LngLatBounds): boolean {
  const [[regionTop, regionLeft], [regionBottom, regionRight]] = normalizeBounds(region.bounds)
 return (
    (regionRight - regionLeft) > (screenBounds.getEast() - screenBounds.getWest() * regionPercentMin)
  )
}
function isRegionTooWideToShow(region: RegionConfig, screenBounds: maplibregl.LngLatBounds): boolean {
  const [[regionTop, regionLeft], [regionBottom, regionRight]] = normalizeBounds(region.bounds)
  return (
    (regionTop - regionBottom) > (screenBounds.getNorth() - screenBounds.getSouth() * regionPercentMin)
  )
}

function isRegionTallEnoughToShow(region: RegionConfig, screenBounds: maplibregl.LngLatBounds): boolean {
  const [[regionTop, regionLeft], [regionBottom, regionRight]] = normalizeBounds(region.bounds)
  return (
    (regionRight - regionLeft) > (screenBounds.getEast() - screenBounds.getWest() * regionPercentMax)
  ) 
}
function isRegionTooTallToShow(region: RegionConfig, screenBounds: maplibregl.LngLatBounds): boolean {
  const [[regionTop, regionLeft], [regionBottom, regionRight]] = normalizeBounds(region.bounds)
  return (
    (regionTop - regionBottom) > (screenBounds.getNorth() - screenBounds.getSouth() * regionPercentMax)
  ) 
}

function shouldRegionBackgroundBeVisible(
  region: RegionConfig,
  screenBounds: maplibregl.LngLatBounds
): boolean {
  return (
    (
      isRegionTallEnoughToShow(region, screenBounds)
    && !isRegionTooTallToShow(region, screenBounds)
    ) || (
      isRegionWideEnoughToShow(region, screenBounds)
    && !isRegionTooWideToShow(region, screenBounds)
    )
  )
}

function shouldRegionTownsBeVisible(
  region: RegionConfig,
  screenBounds: maplibregl.LngLatBounds
): boolean {
  return (
    isRegionTallEnoughToShow(region, screenBounds)
    || isRegionWideEnoughToShow(region, screenBounds)
  )
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

      const backgroundShouldBeVisible = shouldRegionBackgroundBeVisible(region, map.getBounds())

      const townsVisible = shouldRegionTownsBeVisible(region, map.getBounds())
      region.townsActive = shouldBeVisible && townsVisible

      
      for (const layer of region.layers) {
        const layerId = `region-${region.id}-${layer.id}`

        if (!map.getLayer(layerId)) continue

        if (layer.id === 'background' && !backgroundShouldBeVisible) {
          map.setPaintProperty(
            `region-${region.id}-${layer.id}`,
            'raster-opacity',
            0.5,
          )
          continue
        }

        const opacity = shouldBeVisible
          ? regionOverlayOpacity.value
          : 0

        map.setPaintProperty(layerId, 'raster-opacity', opacity)
      }
    }

    scheduleRecompute()
    updateVisibleTownSource()
  }

  requestAnimationFrame(() => {
    syncScheduled = false
    syncRegions()
  })
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

let saveTimeout: number | null = null

function saveMapState() {
  if (!map) return

  const state: MapSaveState = {
    center: [map.getCenter().lng, map.getCenter().lat],
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
  }

  localStorage.setItem(SAVE_KEY, JSON.stringify(state))
}

function scheduleSave() {
  if (saveTimeout) window.clearTimeout(saveTimeout)

  saveTimeout = window.setTimeout(() => {
    saveMapState()
  }, 200)
}

let visiblePopulation = ref(1)

let rafPending = false

function scheduleRecompute() {
  if (rafPending) return
  rafPending = true

  requestAnimationFrame(() => {
    if (!map) return
    map = map!
    rafPending = false
    visiblePopulation.value = computeVisiblePopulation()

    let newExpression = [
      'interpolate', ['linear'],
      [
        '*',
        [
          '/',
          ['get', 'population'],
          visiblePopulation.value
        ],
        ['literal', 1_000]
      ],
      0, 14,
      1, 18,
      10, 24,
      100, 36,
      1_000, 64,
    ]

    try {
      if (!map.getLayer('towns-layer')) {
        console.warn('Failed to update text-size dynamically', 'towns-layer not found')
        return
      }
      map.setLayoutProperty('towns-layer', 'text-size', newExpression)
    } catch (e) {
      console.warn('Failed to update text-size dynamically', e)
    }
  })
}

function updateVisibleTownSource() {
  if (!map) return

  const bounds = map.getBounds()
  const visible = getVisibleTownsInActiveRegions(bounds)

  const data: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: visible.map(t => ({
      type: 'Feature',
      properties: {
        name: t.name,
        population: t.population,
      },
      geometry: {
        type: 'Point',
        coordinates: t.coordinates,
      }
    }))
  }

  const src = map.getSource('towns') as maplibregl.GeoJSONSource
  src.setData(data)
}

onMounted(() => {
  if (!mapEl.value) return

  initMapData()

  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') as MapSaveState | null
    } catch {
      return null
    }
  })()

  map = new maplibregl.Map({
    container: mapEl.value,
    style: { version: 8, sources: {}, layers: [] },
    center: saved?.center ?? [-34.3927, 11.8405],
    zoom: saved?.zoom ?? 6,
    minZoom: 2,
    maxZoom: 12,
    minPitch: 0,
    maxPitch: 85,
    attributionControl: false,
    renderWorldCopies: false,
    pitch: saved?.pitch ?? 0,
    bearing: saved?.bearing ?? 0,
  })

  if (props.dev) {
    map!.getCanvas().style.cursor = 'crosshair'
  }

  map.on('style.load', () => {
    map!.setProjection({ type: 'globe' })
    //map!.setProjection({ type: 'mercator' })
  })

  map.on('load', async () => {
    await initMapData()
    mapReady.value = true
    console.log('Map loaded, initializing sources and layers.')
    try {
      /*
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
      })*/

      const protocol = new Protocol()
      maplibregl.addProtocol('pmtiles', protocol.tile)

      map!.addSource('world-pmtiles', {
        type: 'raster',
        url: 'pmtiles:///assets/kovyalo/map/world.pmtiles',
        tileSize: 256,
        minzoom: 0,
        maxzoom: 12,
      })

      map!.addLayer({
        id: 'world',
        type: 'raster',
        source: 'world-pmtiles'
      })

      // =========================
      // RASTER REGIONS (unchanged)
      // =========================

      for (const config of regionConfigs.value) {
        const region: ManagedRegion = {
          ...config,
          bounds: normalizeBounds(config.bounds),
          active: false,
          townsActive: false,
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
              'raster-opacity': 0.5,
            },
          })
        }
/*
        map!.addSource(`region-src-${region.id}-rivers`, {
          type: 'geojson',
          data: '/assets/kovyalo/map/kovyalo/ziemund/rivers copy.geojson'
        })

        map!.addLayer({
          id: `region-${region.id}-rivers`,
          type: 'line',
          source: `region-src-${region.id}-rivers`,
          paint: {
            'line-color': '#4aa3ff',
            'line-width': [
              'interpolate',
              ['linear'],
              ['get', 'width'],
              0, 0.5,
              10, 2,
              50, 6
            ],
            'line-opacity': 0.8
          }
        })*/

        regions.value.push(region)
      }

      // =========================
      // BUILD LABEL DATA (NEW)
      // =========================
      const regionLabels: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
      }

      const towns: GeoJSON.FeatureCollection = {
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
            textSize: 24,
          },
          geometry: {
            type: 'Point',
            coordinates: [
              b[0][1] + (b[1][1] - b[0][1]) / 2,
              b[0][0] + (b[1][0] - b[0][0]) / 2,
            ],
          },
        })
      }

      // =========================
      // SOURCES (ONCE)
      // =========================
      map!.addSource('terrain', {
        type: 'raster-dem',
        tiles: [
          '/assets/kovyalo/map/kovyalo/ziemund/height-tiles/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        encoding: 'mapbox' // important
      })

      map!.addSource('regions-labels', {
        type: 'geojson',
        data: regionLabels,
      })

      map!.addSource('towns', {
        type: 'geojson',
        data: towns,
      })

      // =========================
      // LAYERS (ORDER = PRIORITY)
      // =========================
      map!.setTerrain({
        source: 'terrain',
        exaggeration: 40.0 // tweak this
      })



      /*
      // regions (low priority)
      map!.addLayer({
        id: 'regions-labels-layer',
        type: 'symbol',
        source: 'regions-labels',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': [
              'interpolate', ['linear'], ['zoom'],
                2, 10,
                6, 16,
                10, 28,
                14, 48
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
      */

      const size = 32
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!

      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2

      ctx.beginPath()
      ctx.arc(size/2, size/2, size/4, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      map!.addImage('town-dot', ctx.getImageData(0, 0, size, size))

      map!.addLayer({
        id: 'towns-layer',
        type: 'symbol',
        source: 'towns',

        layout: {
          // label
          'text-field': ['get', 'name'],
          'text-size': 18,

          // allow smart placement
          'text-variable-anchor': [
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
            'left',
            'right',
            'bottom',
            'top'
          ],
          'text-radial-offset': 0.25,

          // dot (icon)
          'icon-image': 'town-dot', // you must add this image
          'icon-anchor': 'center',

          // scale dot by population (replaces circle-radius)
          'icon-size': [
            'interpolate', ['linear'], ['get', 'population'],
            1, 0.1,
            100, 0.25,
            1000, 0.5,
            10000, 0.75,
            100000, 1.0,
          ],

          // priority (higher = wins collisions)
          'symbol-sort-key': ['*', ['literal', -1], ['get', 'population']],
        },

        paint: {
          'text-color': '#fff',
          'text-halo-color': '#000',
          'text-halo-width': 2,
        },
      })



      map!.addLayer({
        id: 'hillshade',
        type: 'hillshade',
        source: 'terrain',
        paint: {
              'hillshade-method': 'standard',
              'hillshade-illumination-direction': 315,
              'hillshade-shadow-color': '#000000',
              'hillshade-highlight-color': '#FFFFFF',
              'hillshade-accent-color': '#000000',
              'hillshade-exaggeration': 1.0
        }
      })

      requestSync()
    } catch (error) {
      console.error('Failed to initialize map sources:', error)
    }

    updateMouseOnMove()
    updateOnZoom()
    requestSync()
  })
  

  function updateMouseOnMove(e: maplibregl.MapMouseEvent|null = null) {
    e = e as maplibregl.MapMouseEvent | null
    if (!e) { return }
    cursorCoords.value = {
      x: e.lngLat.lng,
      y: e.lngLat.lat,
    }
  }

  function updateOnZoom() {
    if (!map) return
    zoomCurrent.value = map!.getZoom()
    pitchCurrent.value = map!.getPitch()
    bearingCurrent.value = map!.getBearing()
  }

  map.on('mousemove', (e) => {
    if (e) { updateMouseOnMove(e) }
  })

  map.on('moveend', () => {
    requestSync()
    scheduleSave()
    scheduleRecompute()
  })

  map!.on('zoomend', () => {
    updateOnZoom()
    requestSync()
    scheduleSave()
    scheduleRecompute()
  })

  map!.on('rotateend', () => {
    updateOnZoom()
    requestSync()
    scheduleSave()
    scheduleRecompute()
  })

  map!.on('pitchend', () => {
    updateOnZoom()
    requestSync()
    scheduleSave()
    scheduleRecompute()
  })

  onBeforeUnmount(() => {
    map?.remove()
    map = null
  })

  const keys: { [key: string]: boolean } = {};
  const moveSpeed = 300; // pixels/sec
  const rotateSpeed = 90; // deg/sec
  const tiltSpeed = 90; // deg/sec
  const zoomSpeed = 1; // zoom levels/sec

  window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  let last = performance.now();

  function loop(now: number) {
    if(!map) requestAnimationFrame(loop);

    const dt = (now - last) / 1000;
    last = now;

    const bearing = map!.getBearing();

    let forward = 0;
    let strafe = 0;

    if (keys["w"]) forward += 1;
    if (keys["s"]) forward -= 1;
    if (keys["d"]) strafe += 1;
    if (keys["a"]) strafe -= 1;

    // movement (screen/view relative)
    if (forward !== 0 || strafe !== 0) {
      const len = Math.hypot(strafe, forward);
      forward /= len;
      strafe /= len;

      const dx = strafe * moveSpeed * dt;
      const dy = -forward * moveSpeed * dt;

      map!.panBy([dx, dy], { animate: false });
    }

    // rotate
    let newBearing = bearing;

    if (keys["q"]) newBearing += rotateSpeed * dt;
    if (keys["e"]) newBearing -= rotateSpeed * dt;

    if (newBearing !== bearing) {
      map!.rotateTo(newBearing, { animate: false });
    }

    // tilt / pitch
    let pitch = map!.getPitch();
    let newPitch = pitch;

    if (keys["r"]) newPitch -= tiltSpeed * dt;
    if (keys["f"]) newPitch += tiltSpeed * dt;

    newPitch = Math.max(0, Math.min(85, newPitch));

    if (newPitch !== pitch) {
      map!.setPitch(newPitch);
    }

    // zoom
    let zoom = map!.getZoom();
    let newZoom = zoom;

    if (keys["z"]) newZoom += zoomSpeed * dt;
    if (keys["x"]) newZoom -= zoomSpeed * dt;

    if (newZoom !== zoom) {
      map!.zoomTo(newZoom, { animate: false });
    }

    requestAnimationFrame(loop);
  }

  //window.addEventListener("keydown", e => loop);

  requestAnimationFrame(loop);
})
</script>

<template>
  <div v-if="props.dev">
    <h1>Dev Mode</h1>
  </div>
  <div>
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
      <div>
        Pitch: {{ pitchCurrent.toFixed(2) }}
      </div>
      <div>
        Bearing: {{ bearingCurrent.toFixed(2) }}
      </div>
    </div>
    <CompassView id="compass" :map="() => {return map}" :mapReady="mapReady" />
    <div class="fantasy-map-root">
      <div ref="mapEl" class="fantasy-map" />
    </div>
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
