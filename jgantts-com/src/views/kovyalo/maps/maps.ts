import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import { useSettings } from '../common/Settings';
import type {  } from '../common/Settings';
import { watch } from 'vue';
import { effectiveDarkMode } from '../common/DarkMode';

const settings = useSettings()

type JgMap = {
    mlMap: MapLibreMap
    savePosition: () => void
    unmount: () => void
}

type BoundsTuple = [[number, number], [number, number]]

type RegionLayerConfig = {
  type: "tiled" | "single"
  zoom: ZoomConfig|null
  zoomDisplay: ZoomConfig|null
  hasDark: boolean|null
  sort: "political" | "geographical" | null
}

type DataSourceKind = 'towns'

type ZoomConfig = { min: number, max: number }

type RegionConfig = {
  id: string
  title: string
  bounds: BoundsTuple
  zoom: ZoomConfig
  parentId?: string | null
  base: RegionLayerConfig
  background: RegionLayerConfig
  layers: (RegionLayerConfig&{id: string})[]
  dataSources?: {
    kind: DataSourceKind
    points: { name: string; coordinates: [number, number], population: number }[]
  }[]
}

type WorldConfig = {
  world: RegionConfig
  regions: RegionConfig[]
}

type ImageCoordinates = [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
]

const regions: RegionConfig[] = []

type Town = {
  name: string
  coordinates: [number, number]
  population: number
}

type TownPlusRegion = Town & { regionId: string }

let regionConfigs: RegionConfig[] 
let worldRegionConfig: RegionConfig 

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

function applyTheme(map: MapLibreMap) {
  const layers = map.getStyle()?.layers || []

  const UserTheme_SystemTheme = effectiveDarkMode.value

  console.log(UserTheme_SystemTheme)

  console.log("applyTheme")
  console.log(layers)
    
  for (const layer of layers) {
    const layerTheme = (layer.metadata as { theme?: string } | undefined)?.theme
    console.log(layer.metadata)

    if (!layerTheme) continue

    map.setLayoutProperty(
      layer.id,
      'visibility',
      layerTheme === UserTheme_SystemTheme ? 'visible' : 'none'
    )
  }
}

async function internalInitMapSourcesAndLayers(map: MapLibreMap) {
  console.log('Map loaded, initializing sources and layers.')

  let getLayerPath = (region: RegionConfig, layer_id: string) => {
    let getRegionParent = (region: RegionConfig) => {
      let getRegionById = (regionId: string|null) => {
        if (!regionId) return null
        return regionConfigs.filter((region: RegionConfig) => region.id === regionId)[0]
      }
      return getRegionById(region?.parentId ?? null)
    } 
    let parents: RegionConfig[] = []
    let curr: RegionConfig|null = region
    while (curr) {
      console.log(parents)
      console.log(curr)
      parents.push(curr)
      curr = getRegionParent(curr)
    }
    let path = parents.map(config => config?.id).reverse().join("/") + "/" + layer_id;

    console.log(path)
    return path
  }

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

    try {
      const protocol = new Protocol()
      maplibregl.addProtocol('pmtiles', protocol.tile)

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

      map.addSource('towns', {
        type: 'geojson',
        data
      })

      // ==============
      // RASTER REGIONS 
      // ==============
      let make_addRegionLayer = (region: RegionConfig) => {
        let addRegionLayer = (layer: RegionLayerConfig, id: string) => {
          console.log(region.id)
          console.log(id)
          let zoom: { min: number, max: number}|null = null
          if (layer.zoom) {
            zoom = layer.zoom
          } else {
            zoom = region.zoom
          }
          zoom = zoom!
          let zoomDisplay: ZoomConfig|null = null
          if (layer.zoomDisplay) {
            zoomDisplay = layer.zoomDisplay
          } else {
            zoomDisplay = zoom
          }
          zoomDisplay = zoomDisplay!
          let addLayer = (dark: "single"|"dark"|"light") => {
            const darkSuffix = dark == "dark" 
              ? "-dark"
              : ""
              
            const sourceId = `region-src-${region.id}-${id}${darkSuffix}`
            const layerId = `region-${region.id}-${id}${darkSuffix}`

            const metadata = dark == "dark" 
            ? { "theme": "dark" }
            : dark == "light"
            ? { "theme": "light" }
            : null

            if (layer.type === 'tiled') {
              const source = `pmtiles:///assets/maps/${getLayerPath(region, id)}${darkSuffix}.pmtiles`

              map.addSource(sourceId, {
                type: 'raster',
                url: source,
                minzoom: zoom.min,
                maxzoom: zoom.max,
              })

              console.log(region.id + " " + layerId)
              console.log(zoom.max)

              map.addLayer({
                id: layerId,
                type: 'raster',
                source: sourceId,
                minzoom: zoomDisplay.min,
                maxzoom: zoomDisplay.max,
                paint: {
                  'raster-opacity': 1,
                },
                metadata
              })
            } else if (layer.type === 'single') {
              map.addSource(sourceId, {
                type: 'image',
                url: `/assets/maps/${getLayerPath(region, id)}${darkSuffix}.png`,
                coordinates: boundsToImageCoordinates(region.bounds),
              })

              map.addLayer({
                id: layerId,
                type: 'raster',
                source: sourceId,
                minzoom: zoom.min,
                maxzoom: zoom.max,
                paint: {
                  'raster-opacity': 1,
                },
                metadata
              })
            } else {
              throw `No layer type specified for region and layer: ${region.id} - ${layerId}`
            }
          }
          if (layer.hasDark) {
            addLayer("light")
            addLayer("dark")
          } else {
            addLayer("single")
          }
        }

        return addRegionLayer
      }

      let add_world_layer = make_addRegionLayer(worldRegionConfig)
      add_world_layer(worldRegionConfig.base, "base")

      for (const region of regionConfigs) {
        console.log(region)

        let addRegionLayer = make_addRegionLayer(region)

        if (region.background) {
          addRegionLayer(region.background, "background")
        }

        if (region.base) {
          addRegionLayer(region.base, "base")
        }

        for (const layer of region.layers) {
          addRegionLayer(layer, layer.id)
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
      map.addSource('terrain', {
        type: 'raster-dem',
        tiles: [
          '/assets/maps/height-tiles/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        encoding: 'mapbox' // important
      })

      map.addSource('regions-labels', {
        type: 'geojson',
        data: regionLabels,
      })

      // =========================
      // LAYERS (ORDER = PRIORITY)
      // =========================
      map.setTerrain({
        source: 'terrain',
        exaggeration: 40.0 // tweak this
      })

      map.addLayer({
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
      map.addImage('town-dot', ctx.getImageData(0, 0, size, size))

      map.addLayer({
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
}

async function initMap(mapEl: HTMLElement | null, dev: boolean = false): Promise<JgMap | null> {
    let worldConfig = JSON.parse(
        await (await fetch('/assets/maps/geo-data/regions.json')).text()
    ) as WorldConfig

    regionConfigs = worldConfig.regions
    worldRegionConfig = worldConfig.world

    if (!mapEl) return null

  let mapTemp = new maplibregl.Map({
    container: mapEl,
    style: { version: 8, sources: {}, layers: [
        {
            "id": "background",
            "type": "background",
            "paint": {
                "background-color": "rgba(0,0,0,0)"
            }
            }
    ] },
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
        await internalInitMapSourcesAndLayers(mapTemp)
        
        watch(
          effectiveDarkMode,
          (newVal, oldVal) => {
            if (newVal !== oldVal) {
              applyTheme(mapTemp)
            }
          },
          { immediate: true }
        )
    });
    return {
        mlMap: mapTemp,
        savePosition: () => scheduleSave(mapTemp),
        unmount: () => mapTemp.remove()
    }
}


export {
    type JgMap,
    initMap
}