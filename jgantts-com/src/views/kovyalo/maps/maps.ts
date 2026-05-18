import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import { useSettings } from '../common/Settings';
import type {  } from '../common/Settings';
import { reactive, watch } from 'vue';
import { effectiveDarkMode } from '../common/DarkMode';
import type { GuiNode, GuiLeaf, GuiParent, GuiChild, GuiTreeIdentifiable } from '../HUD/GuiView/types/gui';
import { initMapSourcesAndLayers } from './initSources';
import type { RegionConfig, BoundsTuple, ImageCoordinates, JgMap, WorldConfig } from './types/maps'
import { hashGuiPath, hashTitleIntoId } from './common/hashes';

const settings = useSettings()

let regions: RegionConfig[] 

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
    
  for (const layer of layers) {
    const layerTheme = (layer.metadata as { theme?: string } | undefined)?.theme
    const layerGuiPathHash = (layer.metadata as { uiPathHash?: string } | undefined)?.uiPathHash

    let visible: boolean = true

    if (layerTheme) {
      visible = visible && layerTheme === UserTheme_SystemTheme
    }

    if (layerGuiPathHash) {
      visible = visible && guiHashes[layerGuiPathHash]
    }

    map.setLayoutProperty(
      layer.id,
      'visibility',
      visible ? 'visible' : 'none'
    )
  }
}

const guiRoot = reactive<GuiNode>({
  id: "root",
  title: "Root",
  parent: null,
  children: {}
})

let guiHashes: Record<string, boolean> = {}

function initLayerGuiSettings(regions: RegionConfig[]) {
  for (const region of regions) {
    for (const layer of [{ ...region.base, id: "base"}, { ...region.background, id: "background"}, ...region.layers]) {
      if (!layer || !layer.uiPath || layer.uiPath.length === 0) continue

      let current: (GuiLeaf|GuiParent)
                    & GuiChild
                    & GuiTreeIdentifiable 
                    = guiRoot

      // build folder tree
      for (const segment of layer.uiPath) {
        let segmentAsId = hashTitleIntoId(segment)
        let next: GuiNode = current.children[segmentAsId]
        if (!next) {
          next = {
            id: segmentAsId,
            title: segment,
            parent: current,
            children: {}
          }
          current.children[segmentAsId] = next
        }
        current = next
      }

      if (!("uiPathHash" in current)) {
        const leaf = current as GuiLeaf
        leaf.uiPathHash = hashGuiPath(layer.uiPath)
        leaf.enabled = false
      }
    }
  }
}

async function loadConfigFile() {
  return JSON.parse(
    await (await fetch('/assets/maps/geo-data/regions.json')).text()
) as WorldConfig
}

function processConfigFile(worldConfig: WorldConfig) {
  return [worldConfig.world, ...worldConfig.regions]
}

async function initMap(mapEl: HTMLElement | null, dev: boolean = false): Promise<JgMap | null> {

    regions = processConfigFile(await loadConfigFile())

    initLayerGuiSettings(regions)

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

    watch(() => guiRoot, () => {
      let hashesTemp: Record<string, boolean> = {}
    
      let doIt = (node: GuiNode|(GuiNode&GuiLeaf)) => {
        for (const key in node.children) {
          doIt(node.children[key])
        }
    
        if ("uiPathHash" in node && "enabled" in node) {
          hashesTemp[node.uiPathHash] = node.enabled
        }
      }
      
      doIt(guiRoot)
    
      guiHashes = hashesTemp
    
      applyTheme(mapTemp)
    }, { deep: true, immediate: true })

    mapTemp.on('style.load', () => {
      mapTemp!.setProjection({ type: 'globe' })
      //map!.setProjection({ type: 'mercator' })
    })

    mapTemp.on('load', async () => {
        await initMapSourcesAndLayers(mapTemp, regions)
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
        guiTree: guiRoot,
        savePosition: () => scheduleSave(mapTemp),
        unmount: () => mapTemp.remove()
    }
}


export {
    type JgMap,
    initMap
}