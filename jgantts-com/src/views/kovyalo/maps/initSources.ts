import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import type {  } from '../common/Settings';
import type { RegionConfig, RegionLayerConfig, ZoomConfig, TownPlusRegion, Zoom, Zooms, BoundsTuple, ImageCoordinates } from './types/maps'
import { hashGuiPath } from './common/hashes';

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

async function initMapSourcesAndLayers(map: MapLibreMap, regions: RegionConfig[]) {
    console.log('Map loaded, initializing sources and layers.')
  
    let getLayerPath = (region: RegionConfig, layer_id: string) => {
      let getRegionParent = (region: RegionConfig) => {
        let getRegionById = (regionId: string|null) => {
          if (!regionId) return null
          return regions.filter((region: RegionConfig) => region.id === regionId)[0]
        }
        return getRegionById(region?.parentId ?? null)
      }
      let parents: RegionConfig[] = []
      let curr: RegionConfig|null = region
      while (curr) {
        parents.push(curr)
        curr = getRegionParent(curr)
      }
      let path = parents.map(config => config?.id).reverse().join("/") + "/" + layer_id;
  
      return path
    }
  
      let allTowns = regions.reduce<TownPlusRegion[]>(
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
  
        const data: FeatureCollection = {
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
  
        map.setRenderWorldCopies(true)
  
        // ==============
        // RASTER REGIONS 
        // ==============
        let make_addRegionLayer = (region: RegionConfig) => {
          //console.log("region: " + region.id)
          let addRegionLayer = (layer: RegionLayerConfig, id: string) => {
            //console.log("layer: " + region.id + "/" + id)
            let zoomRaw: ZoomConfig|null = null
            if (layer.zoom) {
              zoomRaw = layer.zoom
            } else {
              zoomRaw = region.zoom
            }
            let zoomsFinal: Zooms
            let zooms = zoomRaw as Zooms
            let zoom = zoomRaw as Zoom
            if ("display" in zoomRaw) {
              zoomsFinal = zooms
            } else {
              zoomsFinal = {
                data: zoom,
                display: zoom
              }
            }
  
            let addLayer = (dark: "single"|"dark"|"light") => {
              const darkSuffix = dark == "dark" 
                ? "-dark"
                : ""
                
              const sourceId = `region-src-${region.id}-${id}${darkSuffix}`
              const layerId = `region-${region.id}-${id}${darkSuffix}`
  
              const metadata: any = {}
  
              if (dark) {
                if (dark == "dark") {
                  metadata.theme = "dark" 
                } else if (dark == "light") {
                  metadata.theme = "light"
                }
              }
  
              if (layer.uiPath) {
                metadata.uiPathHash = hashGuiPath(layer.uiPath)
              }
  
              if (layer.type === 'tiled') {
                const source = `pmtiles:///assets/maps/${getLayerPath(region, id)}${darkSuffix}.pmtiles`
  
                map.addSource(sourceId, {
                  type: 'raster',
                  url: source,
                  minzoom: zoomsFinal.data.min,
                  maxzoom: zoomsFinal.data.max,
                  bounds: [region.bounds[0][1], region.bounds[1][0], region.bounds[1][1], region.bounds[0][0]]
                })
  
                map.addLayer({
                  id: layerId,
                  type: 'raster',
                  source: sourceId,
                  minzoom: zoomsFinal.display.min,
                  maxzoom: zoomsFinal.display.max,
                  paint: {
                    'raster-opacity': 1,
                  },
                  layout: {
                    visibility: 'none'
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
                  minzoom: zoomsFinal.display.min,
                  maxzoom: zoomsFinal.display.max,
                  paint: {
                    'raster-opacity': 1,
                  },
                  layout: {
                    visibility: 'none'
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
  
        let makeRegion = (region: RegionConfig) => {
          let addRegionLayer = make_addRegionLayer(region)
  
          if (region.background) {
            addRegionLayer(region.background, "background")
          }
  
          if (region.base) {
            addRegionLayer(region.base, "base")
          }
          
          for (const layer of region.layers ?? []) {
            addRegionLayer(layer, layer.id)
          }
  
        }
        for (const region of regions) {
          makeRegion(region)
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
  
        // =========================
        // LAYERS (ORDER = PRIORITY)
        // =========================
        /*map.setTerrain({
          source: 'terrain',
          exaggeration: 100.0 // tweak this
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
        })*/
  
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

  export {
    initMapSourcesAndLayers
  }
