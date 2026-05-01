<script setup lang="ts">
import type { Map as MapLibreMap } from "maplibre-gl"
import { onMounted, ref, watch } from "vue";

const props = defineProps<{
    map: MapLibreMap|null;
}>();

defineExpose({
    updateCompass,
});

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

const BEARING_MIN = 5
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
<div @click="resetNorth" id="compass">
  <div class="ring">
      <div class="ticks"></div>
      <div ref="needle" class="needle">
          <div class="needle-north"></div>
          <div class="needle-south"></div>
      </div>
      <div class="label n">N</div>
      <div class="label e">E</div>
      <div class="label s">S</div>
      <div class="label w">W</div>
      <div class="center-dot"></div>
  </div>
</div>
</template>


<style>
#compass {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 108px;
  height: 108px;
  z-index: 999;
  border-radius: 50%;
  filter: drop-shadow(0 10px 18px rgba(0,0,0,.45));
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* outer brass frame (slightly more contrast so it reads as metal) */
#compass .ring {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 25%, rgba(255,255,255,.28), transparent 30%),
    radial-gradient(circle at center, #4a3a24 0%, #2a1e12 60%, #140d08 100%);
  border: 2px solid #a8843a;

  box-shadow:
    inset 0 0 0 1px rgba(255,230,170,.25),
    inset 0 0 14px rgba(0,0,0,.55),
    inset 0 0 24px rgba(255,210,140,.06),
    0 0 0 1px rgba(255,240,200,.12);
}

/* engraved face (reduce noise slightly so it doesn't muddy) */
#compass .ring::before {
  content:"";
  position:absolute;
  inset:8px;
  border-radius:50%;
  background:
    radial-gradient(circle, rgba(0,0,0,.12), rgba(0,0,0,.38)),
    repeating-conic-gradient(
      from 0deg,
      rgba(214,180,110,.16) 0deg 6deg,
      transparent 6deg 12deg
    );

  border: 1px solid rgba(200,160,90,.35);

  box-shadow:
    inset 0 0 16px rgba(0,0,0,.45),
    inset 0 0 6px rgba(255,215,140,.06);
}

/* ticks (increase readability; yours was slightly too faint) */
#compass .ticks {
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background:
    repeating-conic-gradient(
      from 0deg,
      rgba(230,200,140,.85) 0deg 1.2deg,
      transparent 1.2deg 11.25deg
    ),
    repeating-conic-gradient(
      from 5.625deg,
      rgba(255,240,200,.5) 0deg .4deg,
      transparent .4deg 22.5deg
    );

  mask: radial-gradient(circle, transparent 58%, black 59%);
  opacity: .9;
}

/* needle container */
#compass .needle {
  position: absolute;
  inset: 16px;
}

/* north / south blades (make them read more like metal enamel, less “flat triangle”) */
#compass .needle-north,
#compass .needle-south {
  position:absolute;
  left:50%;
  transform:translateX(-50%);
  width:0;
  height:0;
}

#compass .needle-north {
  top:0;
  border-left:9px solid transparent;
  border-right:9px solid transparent;
  border-bottom:40px solid #a61f1f;

  filter:
    drop-shadow(0 0 3px rgba(255,70,70,.25));
}

#compass .needle-south {
  bottom:0;
  border-left:9px solid transparent;
  border-right:9px solid transparent;
  border-top:40px solid #d2c6b3;
}

/* pivot (tone it down so it doesn't scream “gem”) */
#compass .center-dot {
  position:absolute;
  left:50%;
  top:50%;
  width:12px;
  height:12px;
  transform:translate(-50%,-50%);
  border-radius:50%;

  background:
    radial-gradient(circle at 35% 35%, #dfe6ee, #6f7a86 60%, #2a313a 100%);

  border: 1px solid rgba(220,200,150,.6);

  box-shadow:
    0 0 6px rgba(0,0,0,.4),
    inset 0 0 4px rgba(255,255,255,.25);
}

/* labels (reduce “fantasy serif glow”, make them instrument-like) */
#compass .label {
  position:absolute;
  font-family: Georgia, "Times New Roman", serif;
  font-size:11px;
  font-weight:700;
  letter-spacing:1px;
  color:#e6d2a4;

  text-shadow:
    0 1px 0 rgba(0,0,0,.9),
    0 0 2px rgba(0,0,0,.5);
}

/* north emphasis but not neon */
#compass .n {
  top:5px;
  left:50%;
  transform:translateX(-50%);
  color:#f2b0a5;
}

#compass .e {
  right:9px;
  top:50%;
  transform:translateY(-50%);
}

#compass .s {
  bottom:5px;
  left:50%;
  transform:translateX(-50%);
}

#compass .w {
  left:9px;
  top:50%;
  transform:translateY(-50%);
}
</style>