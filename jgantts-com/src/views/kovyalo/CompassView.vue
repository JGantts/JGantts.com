<script setup lang="ts">
import type { Map as MapLibreMap } from "maplibre-gl"
import { onMounted, ref, watch } from "vue";
import { useDarkMode } from "./common/DarkMode";

const props = defineProps<{
    map: MapLibreMap|null;
}>();

defineExpose({
    updateCompass,
});

const darkMode = useDarkMode()

let needle = ref<HTMLElement|null>(null);

let lastBearing: number = 0;
let visualAngle: number = 0;

onMounted(() => {
  watch(() => props.map, (map) => {
    if(map) {
        mapReady();
    }
  }, { immediate: true })
})

function mapReady() {
  if(!props.map) return
  lastBearing = props.map!.getBearing();
  visualAngle = -lastBearing;
  requestAnimationFrame(updateCompass);
}

function shortestDelta(from: number, to: number) {
  let delta = to - from;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function updateCompass() {
  if(!props.map) return
  if(!needle.value) return
  const bearing = props.map!.getBearing();

  // smooth across ±180 instead of snapping
  const delta = shortestDelta(lastBearing, bearing);
  visualAngle -= delta;

  needle.value.style.transform = `rotate(${visualAngle}deg)`;

  lastBearing = bearing;
}

const BEARING_MIN = 1
function resetNorth() {
  let _map = props.map
  if(!_map) return
  let bearing = _map.getBearing();
  if (bearing < BEARING_MIN || bearing > (360-BEARING_MIN)) {
    _map.resetNorthPitch();
  } else {
    console.log(bearing)
    _map.resetNorth();
  }
}
</script>

<template>
<div ref="compass" id="compass" @click="resetNorth">

  <!-- STATIC DIAL (NEVER ROTATES) -->
  <div class="dial">
    <svg viewBox="0 0 100 100">
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="none"
        stroke="var(--compass-tick)"
        stroke-width="5"
        stroke-dasharray="calc(2*3.1415*48 * 1/128) calc(2*3.1415*48 * 7/128)"
        transform="rotate(-1.40625 50 50)"
      />
    </svg>

    <div class="label n">N</div>
    <div class="label e">E</div>
    <div class="label s">S</div>
    <div class="label w">W</div>

    <div class="center-dot"></div>
  </div>

  <!-- ROTATING NEEDLE ONLY -->
  <div ref="needle" class="needle">
    <div class="needle-north"></div>
    <div class="needle-south"></div>
  </div>

</div>
</template>

<style>
:root {
--compass-bg: radial-gradient(circle at 30% 25%, #f3e7c2, #d6c08a 55%, #a88952 100%);
--compass-bg-2: #b89a63;

--compass-ring: #5a3f1e;

--compass-tick: rgba(70, 45, 20, 0.7);

--compass-tick-inset: 5px;

--compass-letters-ns-inset: 3px;
--compass-letters-we-inset: 5px;
--compass-letters-font-size: 12px;

--compass-text: #2a1b0f;

--compass-north: #7b1d1a;

--compass-needle-width: 6px;

--compass-shadow:
  0 10px 18px rgba(0,0,0,.25),
  inset 0 0 12px rgba(80,50,20,.18);
}

.dark {
--compass-bg: radial-gradient(circle at 30% 25%, #4a3a24, #2a1e12 60%, #120b07 100%);
--compass-bg-2: #2a2218;

--compass-ring: #c2a15a;

--compass-tick: rgba(255, 220, 160, 0.75);

--compass-tick-inset: 4px;

--compass-letters-ns-inset: 2px;
--compass-letters-we-inset: 4px;
--compass-letters-font-size: 11px;

--compass-text: #f0e0b8;

--compass-north: #d4584f;

--compass-needle-width: 8px;

--compass-shadow:
  0 14px 24px rgba(0,0,0,.65),
  inset 0 0 14px rgba(0,0,0,.35);
}

/* ROOT */
#compass {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 108px;
  height: 108px;
  border-radius: 50%;
  user-select: none;
  z-index: 999;
  filter: drop-shadow(var(--compass-shadow));
}

/* =========================
   STATIC DIAL
========================= */

#compass .dial {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--compass-bg);
  border: 2px solid var(--compass-ring);

  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.08),
    inset 0 0 18px rgba(0,0,0,.4);
}

/* engraved face */
#compass .dial::before {
  content: "";
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(0,0,0,.12), rgba(0,0,0,.38)),
    repeating-conic-gradient(
      from 0deg,
      rgba(255,255,255,.08) 0deg 6deg,
      transparent 6deg 12deg
    );
}

/* labels */
#compass .label {
  position: absolute;
  font-family: system-ui, sans-serif;
  font-size: var(--compass-letters-font-size);
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--compass-text);
  background-color: var(--compass-bg);
}

#compass .n {
  top: var(--compass-letters-ns-inset);
  left: 50%;
  transform: translateX(-50%);
  color: var(--compass-north);
}

#compass .e { right: var(--compass-letters-we-inset); top: 50%; transform: translateY(-50%); }
#compass .s { bottom: var(--compass-letters-ns-inset); left: 50%; transform: translateX(-50%); }
#compass .w { left: var(--compass-letters-we-inset); top: 50%; transform: translateY(-50%); }

/* center dot */
#compass .center-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12px;
  height: 12px;
  transform: translate(-50%, -50%);
  border-radius: 50%;

  background: var(--compass-bg-2);
  border: 1px solid var(--compass-ring);
}

/* =========================
   NEEDLE (ONLY ROTATES)
========================= */

#compass .needle {
  position: absolute;
  inset: 16px;
  transform-origin: center;
  will-change: transform;
}

#compass .needle-north {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 0;

  border-left: var(--compass-needle-width) solid transparent;
  border-right: var(--compass-needle-width) solid transparent;
  border-bottom: 40px solid var(--compass-north);

  filter: drop-shadow(0 0 4px rgba(255,80,80,.25));
}

#compass .needle-south {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;

  border-left: var(--compass-needle-width) solid transparent;
  border-right: var(--compass-needle-width) solid transparent;
  border-top: 40px solid var(--compass-text);
}
</style>