import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import KDBush from 'kdbush';
import { Protocol } from 'pmtiles'
import { useSettings } from '../common/Settings';

const settings = useSettings()

type JgMap = {
    mlMap: MapLibreMap
    savePosition: () => void
    unmount: () => void
}

type BoundsTuple = [[number, number], [number, number]]

type RegionLayerConfig = {
  type: "tiled" | "single"
  imageUrl: string
  sort: "political" | "geographical"
}

type DataSourceKind = 'towns'

type RegionConfig = {
  id: string
  title: string
  bounds: BoundsTuple
  minZoom: number
  maxZoom: number
  parentId?: string | null
  base: RegionLayerConfig
  background: RegionLayerConfig
  layers: (RegionLayerConfig&{id: string})[]
  dataSources?: {
    kind: DataSourceKind
    points: { name: string; coordinates: [number, number], population: number }[]
  }[]
}

type ImageCoordinates = [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
]

const regions: RegionConfig[] = []

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

let regionConfigs = JSON.parse(
    await (await fetch('/assets/maps/geo-data/regions.json')).text()
  ) as RegionConfig[]

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
    map: MapLibreMap | null,
  sourceId: string,
  imageUrl: string,
  bounds: BoundsTuple,
): Promise<void> {
  let _map = map
  if (!_map) return

  const warpedUrl = await createMercatorWarpedImageUrl(imageUrl)

  _map.addSource(sourceId, {
    type: 'image',
    url: warpedUrl,
    coordinates: boundsToImageCoordinates(bounds),
  })
}

let saveTimeout: number | null = null

function saveMapState(map: MapLibreMap) {
  let _map = map

  settings.center = [_map.getCenter().lng, _map.getCenter().lat]
  settings.zoom = _map.getZoom()
  settings.pitch = _map.getPitch()
  settings.bearing = _map.getBearing()
}

function scheduleSave(map: MapLibreMap | null) {
  if (saveTimeout) window.clearTimeout(saveTimeout)

  saveTimeout = window.setTimeout(() => {
    if (!map) return
    saveMapState(map)
  }, 200)
}

function initMap(mapEl: HTMLElement | null, dev: boolean = false): JgMap | null {

    let allTowns = regionConfigs.reduce<TownPlusRegion[]>(
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
        }, [])

    if (!mapEl) return null

  let mapTemp = new maplibregl.Map({
    container: mapEl,
    style: { version: 8, sources: {}, layers: [] },
    center: settings.center,
    zoom: settings.zoom,
    minZoom: 2,
    maxZoom: 10,
    minPitch: 0,
    maxPitch: 75,
    attributionControl: false,
    renderWorldCopies: false,
    pitch: settings.pitch,
    bearing: settings.bearing,
  })
  
  if (dev) {
    mapTemp!.getCanvas().style.cursor = 'crosshair'
  }

  mapTemp.on('style.load', () => {
    mapTemp!.setProjection({ type: 'globe' })
    //map!.setProjection({ type: 'mercator' })
  })

  mapTemp.on('load', async () => {
    console.log('Map loaded, initializing sources and layers.')
    try {
      const protocol = new Protocol()
      maplibregl.addProtocol('pmtiles', protocol.tile)

      mapTemp.addSource('world-pmtiles', {
        type: 'raster',
        url: 'pmtiles:///assets/maps/world.pmtiles',
        tileSize: 256,
        minzoom: 0,
        maxzoom: 6,
      })

      mapTemp.addLayer({
        id: 'world',
        type: 'raster',
        source: 'world-pmtiles'
      })

      const data: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: allTowns.map(t => ({
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

      mapTemp.addSource('towns', {
        type: 'geojson',
        data
      })

      // ==============
      // RASTER REGIONS 
      // ==============

      for (const region of regionConfigs) {


        if (region.background) {
          const sourceId = `region-src-${region.id}-background`
          const layerId = `region-${region.id}-background`
          const source = `pmtiles:///assets/maps/${region.background.imageUrl}.pmtiles`

          console.log(`Adding background layer for region ${region.id} with source ${source}`)

          mapTemp.addSource(sourceId, {
            type: 'raster',
            url: source,
            minzoom: region.minZoom,
            maxzoom: region.maxZoom,
          })

          mapTemp.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-opacity': 1,
            },
          })
        }

        if (region.base) {
          const sourceId = `region-src-${region.id}-base`
          const layerId = `region-${region.id}-base`
          const source = `pmtiles:///assets/maps/${region.base.imageUrl}.pmtiles`

          mapTemp.addSource(sourceId, {
            type: 'raster',
            url: source,
            minzoom: region.minZoom,
            maxzoom: region.maxZoom,
          })

          mapTemp.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-opacity': 1,
            },
          })
        }

        for (const layer of region.layers) {
          const sourceId = `region-src-${region.id}-${layer.id}`
          const layerId = `region-${region.id}-${layer.id}`
          if (layer.type === 'tiled') {
            const source = `pmtiles:///assets/maps/${layer.imageUrl}.pmtiles`

            mapTemp.addSource(sourceId, {
              type: 'raster',
              url: source,
            })

            mapTemp.addLayer({
              id: layerId,
              type: 'raster',
              source: sourceId,
              paint: {
                'raster-opacity': 1,
              },
            })
          } else if (layer.type === 'single') {
            mapTemp.addSource(sourceId, {
              type: 'image',
              url: `/assets/maps/${layer.imageUrl}.png`,
              coordinates: boundsToImageCoordinates(region.bounds),
            })

            mapTemp.addLayer({
              id: layerId,
              type: 'raster',
              source: sourceId,
              paint: {
                'raster-opacity': 1,
              },
            })
          }
        }

        regions.push(region)
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

      for (const region of regions) {
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
      mapTemp.addSource('terrain', {
        type: 'raster-dem',
        tiles: [
          '/assets/maps/height-tiles/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        encoding: 'mapbox' // important
      })

      mapTemp.addSource('regions-labels', {
        type: 'geojson',
        data: regionLabels,
      })

      // =========================
      // LAYERS (ORDER = PRIORITY)
      // =========================
      mapTemp.setTerrain({
        source: 'terrain',
        exaggeration: 40.0 // tweak this
      })

      mapTemp.addLayer({
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
      mapTemp.addImage('town-dot', ctx.getImageData(0, 0, size, size))

      mapTemp.addLayer({
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


    //   requestSync()
    } catch (error) {
      console.error('Failed to initialize map sources:', error)
    }

    
    });
    return {
        mlMap: mapTemp,
        savePosition: () => saveMapState(mapTemp),
        unmount: () => mapTemp.remove()
    }
}


export {
    type JgMap,
    initMap
}