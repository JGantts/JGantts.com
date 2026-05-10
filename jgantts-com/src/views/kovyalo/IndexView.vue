<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, type Ref } from 'vue'
import 'maplibre-gl/dist/maplibre-gl.css'
import CompassView from './CompassView.vue'
import GuiView from './GuiView/GuiView.vue';
import DarkModeButton from './DarkModeButton.vue';
import { initMap, type JgMap } from './maps/maps';

const props = defineProps<{ dev?: boolean }>()

let compassView = ref<InstanceType<typeof CompassView> | null>(null)

const jgMap: Ref<JgMap|null> = ref(null)

const mapEl = ref<HTMLElement | null>(null)

const cursorCoords = ref<{ x: number; y: number } | null>(null)
const zoomCurrent = ref(0)
const pitchCurrent = ref(0)
const bearingCurrent = ref(0)

onMounted(async () => {
  if (!mapEl.value) return

  onBeforeUnmount(() => {
    if (jgMap.value) {
      jgMap.value.unmount()
      jgMap.value = null
    }
  })

  jgMap.value = await initMap(mapEl.value)

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
    jgMap.value?.savePosition()
  })

  mapTemp.on('zoom', (e) => {
    if (e) { updateOnZoom() }
  })

  mapTemp.on('zoomend', () => {
    jgMap.value?.savePosition()
  })

  mapTemp.on('rotateend', () => {
    updateOnZoom()
    jgMap.value?.savePosition()
  })

  mapTemp.on('pitchend', () => {
    updateOnZoom()
    jgMap.value?.savePosition()
  })

    updateMouseOnMove()
    updateOnZoom()
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
  <div id="main">
    <div v-if="props.dev" id="toolbar">
      <h1>Dev Mode</h1>
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
    <div id="map-gui-holder">
      <DarkModeButton />
      <GuiView v-if="jgMap" :map="jgMap" />
      <CompassView ref="compassView" id="compass" :map="jgMap" />
      <div class="fantasy-map-root">
        <div ref="mapEl" class="fantasy-map" />
      </div>
    </div>
  </div>
</template>

<style scoped>
#main {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

#map-gui-holder {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative
}

.fantasy-map-root {
  flex: 1;
  min-height: 0;
  background-color: black;
}

.fantasy-map {
  width: 100%;
  height: 100%;
}
</style>
