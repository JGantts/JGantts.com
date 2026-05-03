<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import KDBush from 'kdbush';
import { Protocol } from 'pmtiles'
import CompassView from './CompassView.vue'
import GuiView from './GuiView.vue';
import DarkModeButton from './DarkModeButton.vue';
import { useSettings } from './common/Settings';
import { initMap, type JgMap } from './maps/maps';

const props = defineProps<{ dev?: boolean }>()

let compassView = ref<InstanceType<typeof CompassView> | null>(null)

const jgMap: Ref<JgMap|null> = ref(null)

const mapEl = ref<HTMLElement | null>(null)

const cursorCoords = ref<{ x: number; y: number } | null>(null)
const zoomCurrent = ref(0)
const pitchCurrent = ref(0)
const bearingCurrent = ref(0)


/*function getVisibleTownsInActiveRegions(bounds: maplibregl.LngLatBounds) {
  if (!townIndex.value) return []

  const foundIds = townIndex.value.range(bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth());

  const foundItems = foundIds.map(i => allTowns.value[i]);

  const visibleTowns = foundItems.filter(town => {
    return getRegionById(town.regionId)?.townsActive
  })

  const visiblePopulation = computeVisiblePopulation(visibleTowns)

  return visibleTowns
}

function computeVisiblePopulation(visibleTowns: TownPlusRegion[]|null = null) {
  if (!map.value) return 1

  const bounds = map.value.getBounds()
  const towns = visibleTowns || getVisibleTownsInActiveRegions(bounds)

  let total = 0
  for (const t of towns) {
    total += t.population
  }

  return total || 1
}*/


/*
function getRegionById(id: string | null | undefined): ManagedRegion | undefined {
  if (!id) return undefined
  return regions.value.find((r) => r.id === id)
}

function isRegionInView(region: RegionConfig): boolean {
  if (!map.value) return false

  const screenBounds = map.value.getBounds()
  const [[regionTop, regionLeft], [regionBottom, regionRight]] = region.bounds

  const center = map.value.getCenter()

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
*/
/*
let syncScheduled = false

function requestSync() {
  
  if (syncScheduled) return
  syncScheduled = true

  function syncRegions(): void {
    if (!map.value) return

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

      const backgroundShouldBeVisible = shouldRegionBackgroundBeVisible(region, map.value.getBounds())

      const townsVisible = shouldRegionTownsBeVisible(region, map.value.getBounds())
      region.townsActive = shouldBeVisible && townsVisible

      
      for (const layer of region.layers) {
        const layerId = `region-${region.id}-${layer.id}`

        if (!map.value.getLayer(layerId)) continue

        if (layer.id === 'background' && !backgroundShouldBeVisible) {
          map.value.setPaintProperty(
            `region-${region.id}-${layer.id}`,
            'raster-opacity',
            1,
          )
          continue
        }

        const opacity = shouldBeVisible
          ? 1
          : 1

        map.value.setPaintProperty(layerId, 'raster-opacity', opacity)
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
*/




/*
let visiblePopulation = ref(1)

let rafPending = false

function scheduleRecompute() {
  if (rafPending) return
  rafPending = true

  let _map = map.value
  if (!_map) return

  requestAnimationFrame(() => {
    if (!_map) return
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
      if (_map.getLayer('towns-layer')) {
        console.warn('Failed to update text-size dynamically', 'towns-layer not found')
        return
      }
      _map.setLayoutProperty('towns-layer', 'text-size', newExpression)
    } catch (e) {
      console.warn('Failed to update text-size dynamically', e)
    }
  })
}*/

/*
function updateVisibleTownSource() {
  if (!map.value) return

  const bounds = map.value.getBounds()
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

  const src = map.value.getSource('towns') as maplibregl.GeoJSONSource
  src.setData(data)
}
*/


onMounted(async () => {
  if (!mapEl.value) return

  onBeforeUnmount(() => {
    if (jgMap.value) {
      jgMap.value.unmount()
      jgMap.value = null
    }
  })

  jgMap.value = initMap(mapEl.value)

  if (!jgMap) return

  let mapTemp = jgMap.value?.mlMap

  if (!mapTemp) return


  function updateMouseOnMove(e: maplibregl.MapMouseEvent|null = null) {
    e = e as maplibregl.MapMouseEvent | null
    if (!e) { return }
    cursorCoords.value = {
      x: e.lngLat.lng,
      y: e.lngLat.lat,
    }
  }

  function updateOnZoom() {
    let _map = jgMap.value?.mlMap
    if (!_map) return
    zoomCurrent.value = _map.getZoom()
    pitchCurrent.value = _map.getPitch()
    bearingCurrent.value = _map.getBearing()
  }

  mapTemp.on('mousemove', (e) => {
    if (e) { updateMouseOnMove(e) }
  })

  mapTemp.on('moveend', () => {
    // requestSync()
    jgMap.value?.savePosition()
    // scheduleRecompute()
  })

  mapTemp.on('zoom', (e) => {
    if (e) { updateOnZoom() }
  })

  mapTemp.on('zoomend', () => {
    //requestSync()
    jgMap.value?.savePosition()
    //scheduleRecompute()
  })

  mapTemp.on('rotateend', () => {
    updateOnZoom()
    // requestSync()
    jgMap.value?.savePosition()
    // scheduleRecompute()
  })

  mapTemp.on('pitchend', () => {
    updateOnZoom()
    // requestSync()
    jgMap.value?.savePosition()
    // scheduleRecompute()
  })

    updateMouseOnMove()
    updateOnZoom()
    // requestSync()
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

  let animationLoopBusy = false;
  async function animationLoop() {
    if (animationLoopBusy) return;

    animationLoopBusy = true;
    let now = performance.now();
    try {
      await performLoop(now);
    } finally {
      last = now;
      animationLoopBusy = false;
      requestAnimationFrame(animationLoop);
    }
  }

  async function performLoop(now: number) {
    await interfaceLoop(now);
    await componentsLoop(now);
  }

  async function componentsLoop(now: number) {
    compassView.value?.updateCompass()
  }

  async function interfaceLoop(now: number) {
    let _map = jgMap.value?.mlMap
    if (!_map) return

    const dt = (now - last) / 1000;
    last = now;

    const bearing = _map.getBearing();

    let forward = 0;
    let strafe = 0;

    const hasModifier =
      keys["shift"] ||
      keys["control"] ||
      keys["alt"] ||
      keys["meta"];

    if (!hasModifier) {

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

        _map.panBy([dx, dy], { animate: false });
      }

      // rotate
      let newBearing = bearing;

      if (keys["q"]) newBearing += rotateSpeed * dt;
      if (keys["e"]) newBearing -= rotateSpeed * dt;

      if (newBearing !== bearing) {
        _map.rotateTo(newBearing, { animate: false });
      }

      // tilt / pitch
      let pitch = _map.getPitch();
      let newPitch = pitch;

      if (keys["r"]) newPitch -= tiltSpeed * dt;
      if (keys["f"]) newPitch += tiltSpeed * dt;

      newPitch = Math.max(0, Math.min(85, newPitch));

      if (newPitch !== pitch) {
        _map.setPitch(newPitch);
      }

      // zoom
      let zoom = _map.getZoom();
      let newZoom = zoom;

      if (keys["z"]) newZoom += zoomSpeed * dt;
      if (keys["x"]) newZoom -= zoomSpeed * dt;

      if (newZoom !== zoom) {
        _map.zoomTo(newZoom, { animate: false });
      }
    }
  }

  //window.addEventListener("keydown", e => loop);

  requestAnimationFrame(animationLoop);
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
    <DarkModeButton />
    <GuiView />
    <CompassView ref="compassView" id="compass" :map="jgMap" />
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
