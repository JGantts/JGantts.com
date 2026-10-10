import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import { useSettings } from '../common/Settings';
import { townFonts, townLabel, townLabelImage, townLabelOffsets, townTextSize, townLabelPlacement, resizeTownLabels } from './townLabels';
import { townNameProperties } from './rubyLabels';
import { addRegionLabels } from './regionLabels';
import { syncOverviewTownDots } from './townDots';
import type { RegionConfig, RegionLayerConfig, ZoomConfig, TownPlusRegion, Zoom, Zooms, BoundsTuple, ImageCoordinates } from './types/maps'
import { hashGuiPath } from './common/hashes';
import { cartography } from './cartography';
import { rasterPaint } from './rasterStyle';
import { settlementRadius, markerPaint, addTownMarkerObstacles } from './settlements';
import { loadBoundaryRaster, installBoundaryPlacement } from './boundaryPlacement';
import { addPoliticalBoundaries } from './politicalBoundaries';
import { addRiverLines } from './riverLines';

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

async function initMapSourcesAndLayers(map: MapLibreMap, regions: RegionConfig[], signal?: AbortSignal) {
    const boundaryLayers: (() => Promise<void>)[] = []
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
                    title: town.title,
                    coordinates: town.coordinates,
                    population: town.population,
                    settlementClass: town.settlementClass,
                    regionId: curr.id,
                  };
                }))
                return acc
              }, []))
            ]
          }, [])
  
      // Rank within each region so overview maps retain at most two towns.
      const townLabelMinZoom = new Map<TownPlusRegion, number>()
      const regionMinZoom = new Map<string, number>()
      for (const region of regions) {
        const zoom = 'display' in region.zoom ? region.zoom.display : region.zoom
        regionMinZoom.set(region.id, zoom.min)
        const towns = allTowns.filter(town => town.regionId === region.id)
          .sort((a, b) => b.population - a.population)
        towns.forEach((town, rank) => townLabelMinZoom.set(town,
          rank < 2 ? Math.max(0, zoom.min - 1) : zoom.min +
            (town.population < cartography.settlements.townPopulation && !['capital', 'city', 'town'].includes(town.settlementClass ?? '')
              ? cartography.settlements.minorLabelZoomDelay : 0)))
      }

      try {
        const protocol = new Protocol()
        maplibregl.addProtocol('pmtiles', protocol.tile)
  
        const data: FeatureCollection = {
          type: 'FeatureCollection',
          features: allTowns.map((t, id) => ({
            id,
            type: 'Feature',
            properties: {
              ...townNameProperties(map, t.title.native, t.title.hangul, t.title.latin),
              latin: t.title.latin ?? '',
              population: t.population,
              markerRadius: settlementRadius(t),
              markerPriority: t.settlementClass === 'capital' ? 1e12 + t.population : t.population,
              labelMinZoom: townLabelMinZoom.get(t),
              regionMinZoom: regionMinZoom.get(t.regionId),
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

              const imageUrl = `/assets/maps/${getLayerPath(region, id)}${darkSuffix}.png`
  
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
  
              if (layer.riverGuide) {
                // Reserve the configured stacking position while the vector
                // asset loads; river/border fetch completion order must not matter.
                const positionId = `${layerId}-position`
                map.addLayer({ id: positionId, type: 'background', paint: { 'background-opacity': 0 } })
                boundaryLayers.push(async () => {
                  try {
                    await addRiverLines(map, layerId, `/assets/maps/${getLayerPath(region, id)}-flow.geojson`,
                      zoomsFinal.display.min, zoomsFinal.display.max, metadata, positionId, signal)
                  } catch (error) {
                    if (signal?.aborted) return
                    console.warn('River network unavailable; using original river artwork:', error)
                    map.addSource(sourceId, { type: 'image', url: imageUrl,
                      coordinates: boundsToImageCoordinates(region.bounds) })
                    map.addLayer({ id: layerId, type: 'raster', source: sourceId,
                      minzoom: zoomsFinal.display.min, maxzoom: zoomsFinal.display.max,
                      paint: rasterPaint(id, layer), layout: { visibility: 'none' }, metadata,
                    }, positionId)
                  }
                  map.removeLayer(positionId)
                })
              } else if (layer.boundaryGuide) {
                boundaryLayers.push(async () => {
                  try {
                    await addPoliticalBoundaries(map, layerId,
                      `/assets/maps/${getLayerPath(region, id)}-classes.geojson`, zoomsFinal.display.min, zoomsFinal.display.max, metadata, signal)
                  } catch (error) {
                    if (signal?.aborted) return
                    // The site and map assets deploy separately. Keep the original
                    // artwork visible if a classified asset has not arrived yet.
                    console.warn('Classified boundaries unavailable; using original border artwork:', error)
                    map.addSource(sourceId, { type: 'image', url: imageUrl,
                      coordinates: boundsToImageCoordinates(region.bounds) })
                    map.addLayer({ id: layerId, type: 'raster', source: sourceId,
                      minzoom: zoomsFinal.display.min, maxzoom: zoomsFinal.display.max,
                      paint: rasterPaint(id, layer), layout: { visibility: 'none' }, metadata,
                    }, 'town-dots')
                    await loadBoundaryRaster(map, layerId, imageUrl, region.bounds,
                      zoomsFinal.display.min, zoomsFinal.display.max, metadata, false, signal)
                  }
                })
              } else if (layer.type === 'tiled') {
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
                  paint: rasterPaint(id, layer),
                  layout: {
                    visibility: 'none'
                  },
                  metadata
                })
              } else if (layer.type === 'single') {
                map.addSource(sourceId, {
                  type: 'image',
                  url: imageUrl,
                  coordinates: boundsToImageCoordinates(region.bounds),
                })
  
                map.addLayer({
                  id: layerId,
                  type: 'raster',
                  source: sourceId,
                  minzoom: zoomsFinal.display.min,
                  maxzoom: zoomsFinal.display.max,
                  paint: rasterPaint(id, layer),
                  layout: {
                    visibility: 'none'
                  },
                  metadata
                })
                if (id === 'borders' || (id === 'states' && !region.layers.some(item => item.boundaryGuide === id)) || layer.styleRole === 'national-border' || layer.styleRole === 'administrative-border') {
                  boundaryLayers.push(() => loadBoundaryRaster(map, layerId, imageUrl, region.bounds,
                    zoomsFinal.display.min, zoomsFinal.display.max, metadata, id === 'states', signal))
                }
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
  
        map.addLayer({
          id: 'town-dots',
          type: 'circle',
          source: 'towns',
          filter: ['>=', ['zoom'], ['get', 'regionMinZoom']],
          layout: { 'circle-sort-key': ['get', 'markerPriority'] },
          paint: markerPaint,
        })

        map.addLayer({
          id: 'towns-layer',
          type: 'symbol',
          source: 'towns',
          filter: ['>=', ['zoom'], ['get', 'labelMinZoom']],
  
          layout: {
            // label
            'text-field': townLabel(useSettings().labelMode),
            'text-font': townFonts,
            'text-size': townTextSize,
            'text-line-height': 1,
            'text-max-width': 1000,
            'text-letter-spacing': 0,
  
            ...townLabelPlacement,
            'text-variable-anchor-offset': townLabelOffsets(useSettings().labelMode, map),

            // Anchor the visible label by its native-only content rectangle.
            'icon-image': townLabelImage(useSettings().labelMode),
            'icon-text-fit': 'both',
            // Leave breathing room around names; larger towns keep priority
            // while smaller towns become visible as the map is zoomed in.
            'icon-padding': cartography.labels.collisionPadding,
            // The fitted image includes translations and ruby outside the native
            // anchor. Check its bounds when trying anchors and reserve that space.
            'icon-allow-overlap': false,
            'icon-ignore-placement': false,

            // priority (higher = wins collisions)
            'symbol-sort-key': ['*', ['literal', -1], ['get', 'markerPriority']],
          },
  
          paint: {
            // Text supplies placement geometry; the fitted image draws the label.
            'text-opacity': 0,
          },
        })

        // Later symbol layers win collisions, keeping region names prominent.
        addRegionLabels(map, regions, useSettings().labelMode)

        await Promise.all(boundaryLayers.map(add => add().catch(error => { if (!signal?.aborted) console.warn('Could not reserve border label clearance:', error) })))

        if (signal?.aborted) return

        addTownMarkerObstacles(map)

        syncOverviewTownDots(map)

        const resizeLabels = () => resizeTownLabels(map)
        resizeLabels()
        map.on('resize', resizeLabels)
        map.once('remove', () => map.off('resize', resizeLabels))
        installBoundaryPlacement(map, data, () => useSettings().labelMode)
  
      //   requestSync()
      } catch (error) {
        if (!signal?.aborted) console.error('Failed to initialize map sources:', error)
      }
  }

  export {
    initMapSourcesAndLayers
  }
