<script setup lang="ts">
import { onMounted, watch } from "vue";
import TreeNodeView from "./TreeNodeView.vue"
import type { JgMap } from "../maps/maps";

const props = defineProps<{
  map: JgMap
}>()

onMounted(() => {
  console.log(props.map.guiTree)
})

watch(props.map.guiTree, () => {
  console.log(props.map.guiTree
  )
})
</script>

<template>
  <div id="overlay">
    <div class="panel">
      <div class="section">
        <div class="title">LAYERS</div>
        <TreeNodeView
          v-if="map.guiTree"
          :node="map.guiTree"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ROOT */
#overlay {
  position: absolute;
  top: 18px;
  left: 18px;
  width: 240px;
  z-index: 999;
  pointer-events: none;
  user-select: none;
}
</style>

<style>
input[type="range"] {
  width: 100%;
  margin: 0;
  padding: 0;
}

:root {
  --panel-bg:
    radial-gradient(circle at 30% 25%, #f6ecd2, #e2d2a8 60%, #c9ad78 100%);

  --panel-border: #5a3f1e;

  --panel-glow:
    inset 0 0 0 1px rgba(255,255,255,.35),
    inset 0 0 14px rgba(60,40,20,.18),
    0 8px 16px rgba(0,0,0,.18);

  --panel-text: #2a1b0f;

  --panel-accent: #7a1d1a;

  --panel-muted: rgba(60,40,25,.6);

  --tick: rgba(70,45,20,.65);

  --button-bg: #e9dbc0;
  --button-border: rgba(90,60,25,.25);
  --button-active: #d6c19a;
}

.dark {
  --panel-bg:
    radial-gradient(circle at 25% 20%, #4a3a24, #2a1e12 60%, #120b07 100%);

  --panel-border: #c2a15a;

  --panel-glow:
    inset 0 0 0 1px rgba(255,220,160,.15),
    inset 0 0 18px rgba(0,0,0,.55),
    0 10px 18px rgba(0,0,0,.5);

  --panel-text: #f0e0b8;

  --panel-accent: #d4584f;

  --panel-muted: rgba(230,200,140,.55);

  --tick: rgba(230,200,140,.6);

  --button-bg: #2a1e12;
  --button-border: rgba(200,160,90,.35);
  --button-active: #5a4424;
}

#overlay .panel {
  pointer-events: auto;
  border-radius: 14px;

  background: var(--panel-bg);
  border: 1px solid var(--panel-border);

  box-shadow: var(--panel-glow);

  padding: 10px 12px;

  font-family: system-ui, sans-serif;
  color: var(--panel-text);
}

/* DARK mode gets serif (like your compass vibe) */
.dark #overlay .panel {
  font-family: Georgia, "Times New Roman", serif;
}

/* SECTIONS */
.section {
  margin-bottom: 12px;
}

.title {
  font-size: 11px;
  letter-spacing: 1px;
  margin-bottom: 6px;
  opacity: 0.8;
}

/* ERA */
.era-readout {
  width: 100%;
  text-align: center;
  margin-bottom: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.era-duo {
  font-size: 18px;
  letter-spacing: 2px;
  color: var(--panel-accent);
}

.dark .era-duo {
  text-shadow: 0 0 6px rgba(0,0,0,.6);
}

.era-dec {
  font-size: 10px;
  opacity: 0.6;
}

.era-notes {
  text-align: right;
  line-height: 9px;
}

.era-notes-header {
  font-size: 10px;
  opacity: 0.8;
}

.era-notes .ipa {
  font-family: "Lucida Sans Unicode", "DejaVu Sans", sans-serif;
  font-size: 10px;
  opacity: 0.6;
}

.era-notes-footer {
  font-size: 8px;
  opacity: 0.8;
}

/* SLIDER */
.slider-wrap {
  position: relative;
  padding-top: 24px;
}

input[type="range"] {
  width: 100%;
  accent-color: var(--panel-accent);
  position: relative;
  z-index: 2;
}

/* TICKS */
.ticks {
  position: absolute;
  top: 0;
  left: 7px;   /* half thumb width */
  right: 7px;  /* half thumb width */
  height: 18px;
}

.tick {
  position: absolute;
  transform: translateX(-50%);
  text-align: center;
}

.tick-line {
  width: 1px;
  height: 8px;
  background: var(--tick);
  margin: 0 auto;
}

.tick-label {
  font-size: 9px;
  margin-top: 1px;
  opacity: 0.7;
  transform: scale(0.9);
}

input[type="range"] {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
}

/* track */
input[type="range"]::-webkit-slider-runnable-track {
  height: 2px;
  background: var(--tick);
}

/* thumb */
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;

  width: 14px;
  height: 14px;
  border-radius: 50%;

  background: var(--panel-accent);
  border: 1px solid rgba(0,0,0,.2);

  margin-top: -6px; /* 👈 THIS is the critical alignment fix */
}

/* MODE BUTTONS */
.segmented {
  display: flex;
  gap: 4px;
}

.segmented button {
  flex: 1;
  background: var(--button-bg);
  border: 1px solid var(--button-border);
  color: var(--panel-text);
  padding: 4px;
  font-size: 11px;
  border-radius: 6px;
  cursor: pointer;
}

.segmented button.active {
  background: var(--button-active);
  box-shadow: inset 0 0 6px rgba(0,0,0,.15);
}

.dark .segmented button.active {
  box-shadow: inset 0 0 6px rgba(255,220,140,.2);
}
</style>