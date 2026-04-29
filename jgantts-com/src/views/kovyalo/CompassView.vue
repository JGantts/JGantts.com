<script setup lang="ts">
import type { Map as MapLibreMap } from "maplibre-gl"
import { onMounted, watch } from "vue";

const props = defineProps<{
    map: () => MapLibreMap|null;
    mapReady: boolean;
}>();

defineExpose({
    updateCompass,
});

let compass: HTMLElement|null = null;
let needle: HTMLElement|null = null;
let lastBearing: number = 0;
let visualAngle: number = 0;

let compassInitialized = false;

function mapReady() {
    console.log("Map is ready.");
    if (compassInitialized) return
    console.log("Initializing compass.")
    const map = props.map()
    if (!map) {
        console.error("Map is not available.");
        return
    }
    compassInitialized = true;
    console.log("Map loaded, initializing compass.")
    if(!map) return
    compass = document.getElementById("compass");
    needle = (compass?.querySelector(".needle") || null);
    lastBearing = map?.getBearing() || 0;
    visualAngle = -lastBearing;
    requestAnimationFrame(loop);
}

onMounted(() => {
    watch(() => props.mapReady, (ready) => {
        if(ready) {
            mapReady();
        }
    })

    if(props.mapReady) {
        mapReady();
    }
})

function shortestDelta(from: number, to: number) {
  let delta = to - from;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function loop() {
    updateCompass();
    requestAnimationFrame(loop);
}

function updateCompass() {
    console.log("updateCompass")
    const map = props.map()
    if(!map) return
    if(!needle) return
    const bearing = map!.getBearing();

    // smooth across ±180 instead of snapping
    const delta = shortestDelta(lastBearing, bearing);
    visualAngle -= delta;

    needle!.style.transform = `rotate(${visualAngle}deg)`;

    lastBearing = bearing;
    }
</script>

<template>
<div id="compass">
    <div class="ring">
        <div class="ticks"></div>
        <div class="needle">
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
  pointer-events: none;
  filter: drop-shadow(0 10px 18px rgba(0,0,0,.45));
}

/* outer brass frame */
#compass .ring {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 25%, rgba(255,255,255,.22), transparent 28%),
    radial-gradient(circle at center, #3e3222 0%, #23190f 65%, #120c07 100%);
  border: 3px solid #8f6a2d;
  box-shadow:
    inset 0 0 0 2px rgba(214,176,93,.55),
    inset 0 0 14px rgba(0,0,0,.55),
    inset 0 0 28px rgba(255,220,140,.08),
    0 0 0 1px rgba(255,230,170,.18);
}

/* engraved inner face */
#compass .ring::before{
  content:"";
  position:absolute;
  inset:8px;
  border-radius:50%;
  background:
    radial-gradient(circle, rgba(0,0,0,.15), rgba(0,0,0,.35)),
    repeating-conic-gradient(
      from 0deg,
      rgba(212,183,120,.14) 0deg 6deg,
      rgba(0,0,0,0) 6deg 12deg
    );
  border:1px solid rgba(196,155,86,.45);
  box-shadow:
    inset 0 0 18px rgba(0,0,0,.45),
    inset 0 0 6px rgba(255,215,130,.08);
}

/* starburst runes / ticks */
#compass .ticks {
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background:
    repeating-conic-gradient(
      from 0deg,
      #d7b676 0deg .9deg,
      transparent .9deg 11.25deg
    ),
    repeating-conic-gradient(
      from 5.625deg,
      rgba(255,235,180,.55) 0deg .35deg,
      transparent .35deg 22.5deg
    );
  mask: radial-gradient(circle, transparent 58%, black 59%);
  opacity: .95;
}

#compass .needle {
  position: absolute;
  inset: 16px;
}

/* north blade */
#compass .needle-north,
#compass .needle-south{
  position:absolute;
  left:50%;
  transform:translateX(-50%);
  width:0;
  height:0;
}

#compass .needle-north{
  top:0;
  border-left:10px solid transparent;
  border-right:10px solid transparent;
  border-bottom:38px solid #b42020;
  filter: drop-shadow(0 0 4px rgba(255,80,80,.35));
}

/* south blade */
#compass .needle-south{
  bottom:0;
  border-left:10px solid transparent;
  border-right:10px solid transparent;
  border-top:38px solid #d8d0bf;
}

/* gemstone pivot */
#compass .center-dot{
  position:absolute;
  left:50%;
  top:50%;
  width:14px;
  height:14px;
  transform:translate(-50%,-50%);
  border-radius:50%;
  background:
    radial-gradient(circle at 35% 35%, #8ff7ff, #167e92 60%, #06333d 100%);
  border:2px solid #d7b676;
  box-shadow:
    0 0 8px rgba(110,255,255,.35),
    inset 0 0 5px rgba(255,255,255,.35);
}

/* labels */
#compass .label{
  position:absolute;
  font-family: Georgia, "Times New Roman", serif;
  font-size:12px;
  font-weight:700;
  letter-spacing:1px;
  color:#e8d3a0;
  text-shadow:
    0 1px 0 #000,
    0 0 4px rgba(0,0,0,.75);
}

#compass .n{
  top:5px;
  left:50%;
  transform:translateX(-50%);
  color:#ff8a7a;
}

#compass .e{
  right:9px;
  top:50%;
  transform:translateY(-50%);
}

#compass .s{
  bottom:5px;
  left:50%;
  transform:translateX(-50%);
}

#compass .w{
  left:9px;
  top:50%;
  transform:translateY(-50%);
}
</style>
