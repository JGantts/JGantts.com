<script setup lang="ts">
import { MapLibreMap } from "maplibre-gl";
import { onMounted, watch, type Ref } from "vue";

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
  width: 92px;
  height: 92px;
  z-index: 999;
  pointer-events: none;
}

#compass .ring {
  position:relative;
  width:100%;
  height:100%;
  border-radius:50%;
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,.25), rgba(255,255,255,0) 35%),
    radial-gradient(circle at center, rgba(255,255,255,.08), rgba(0,0,0,.55));
  border:2px solid rgba(255,255,255,.45);
  box-shadow:
    0 8px 20px rgba(0,0,0,.35),
    inset 0 0 10px rgba(255,255,255,.08),
    inset 0 0 20px rgba(0,0,0,.45);
  backdrop-filter: blur(6px);
}

#compass .ticks{
  position:absolute;
  inset:6px;
  border-radius:50%;
  background:
    repeating-conic-gradient(
      from 0deg,
      rgba(255,255,255,.65) 0deg 1deg,
      transparent 1deg 15deg
    );
  mask: radial-gradient(circle, transparent 58%, black 59%);
}

#compass .needle{
  position:absolute;
  inset:14px;
}

#compass .needle-north,
#compass .needle-south{
  position:absolute;
  left:50%;
  transform:translateX(-50%);
  width:0;
  height:0;
}

#compass .needle-north{
  top:2px;
  border-left:8px solid transparent;
  border-right:8px solid transparent;
  border-bottom:30px solid #ff4040;
}

#compass .needle-south{
  bottom:2px;
  border-left:8px solid transparent;
  border-right:8px solid transparent;
  border-top:30px solid rgba(255,255,255,.85);
}

#compass .center-dot{
  position:absolute;
  left:50%;
  top:50%;
  width:10px;
  height:10px;
  transform:translate(-50%,-50%);
  border-radius:50%;
  background:white;
}

#compass .label{
  position:absolute;
  font:700 11px system-ui,sans-serif;
  color:white;
  text-shadow:0 1px 3px rgba(0,0,0,.8);
}

#compass .n{ top:4px; left:50%; transform:translateX(-50%); color:#ff7070; }
#compass .e{ right:7px; top:50%; transform:translateY(-50%); }
#compass .s{ bottom:4px; left:50%; transform:translateX(-50%); }
#compass .w{ left:7px; top:50%; transform:translateY(-50%); }
</style>
