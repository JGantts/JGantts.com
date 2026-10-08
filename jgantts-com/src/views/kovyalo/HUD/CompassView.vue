<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { JgMap } from "../maps/maps";

const props = defineProps<{
    map: JgMap;
}>();

defineExpose({
    updateCompass,
});

const rose = ref<HTMLElement|null>(null);

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
  if(!props.map?.mlMap) return
  lastBearing = props.map.mlMap.getBearing();
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
  if(!props.map?.mlMap) return
  if(!rose.value) return
  const bearing = props.map.mlMap.getBearing();

  // smooth across ±180 instead of snapping
  const delta = shortestDelta(lastBearing, bearing);
  visualAngle -= delta;

  rose.value.style.transform = `rotate(${visualAngle}deg)`;

  lastBearing = bearing;
}

const BEARING_MIN = 1
function resetNorth() {
  let _map = props.map?.mlMap
  if(!_map) return
  let bearing = _map.getBearing();
  if (Math.abs(bearing) < BEARING_MIN) {
    _map.resetNorthPitch();
  } else {
    _map.resetNorth();
  }
}
</script>

<template>
<button id="compass" type="button" aria-label="Reset map north; tap again to level tilt" title="Reset north; tap again to level tilt" @click="resetNorth">
  <div ref="rose" class="compass-rose" aria-hidden="true">
  <!-- Dial and needle rotate together so every direction stays accurate. -->
  <div class="dial">
    <svg viewBox="0 0 100 100">
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="none"
        stroke="var(--compass-tick)"
        stroke-width="5"
        stroke-dasharray="2.356 16.493"
        transform="rotate(-1.40625 50 50)"
      />
    </svg>

    <div class="label n">N</div>
    <div class="label e">E</div>
    <div class="label s">S</div>
    <div class="label w">W</div>

    <div class="center-dot"></div>
  </div>

  <!-- North/south needle -->
  <div class="needle">
    <div class="needle-north"></div>
    <div class="needle-south"></div>
  </div>

  </div>
</button>
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
  padding: 0;
  border: 0;
  background: transparent;
  pointer-events: all;
  cursor: pointer;

  position: relative;
  width: 108px;
  height: 108px;
  flex: 0 0 auto;
  border-radius: 50%;
  user-select: none;
  box-shadow: var(--compass-shadow);
}

#compass:focus-visible { outline: 3px solid var(--compass-ring); outline-offset: 3px; }
#compass .compass-rose { position: absolute; inset: 0; border-radius: 50%; }
#compass svg { display: block; width: 100%; height: 100%; }


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
@media (max-width: 640px), (max-height: 500px) {
  #compass { width: 64px; height: 64px; --compass-needle-width: 4px; --compass-letters-font-size: 10px; }
  #compass .needle { inset: 13px; }
  #compass .needle-north { border-bottom-width: 20px; }
  #compass .needle-south { border-top-width: 20px; }
}
</style>
