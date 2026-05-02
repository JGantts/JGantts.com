<script setup lang="ts">
import { ref, watch, computed } from "vue";

const theme = ref<"dark" | "light">("dark");

function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
}

const eraSuazem = ref(1200);

const mode = ref<"political" | "physical" | "hybrid">("political");

const overlays = ref({
  cities: true,
  roads: true,
  borders: true,
  labels: true,
});

const emit = defineEmits<{
  (e: "update:eraSuazem", v: number): void;
  (e: "update:mode", v: string): void;
  (e: "update:overlays", v: any): void;
}>();

watch(eraSuazem, v => emit("update:eraSuazem", v));
watch(mode, v => emit("update:mode", v));
watch(overlays, v => emit("update:overlays", v), { deep: true });

function toggle(obj: any, key: string) {
  obj[key] = !obj[key];
}

/* ---------------- ERA FORMATTING ---------------- */

const BASE12_DIGITS = ["0","1","2","3","4","5","6","7","8","9","X","E"];

function toBase12Suazem(suazem: number) {
  if (suazem === 0) return "0";
  let v = Math.floor(suazem);
  const out: string[] = [];

  while (v > 0) {
    out.unshift(BASE12_DIGITS[v % 12]);
    v = Math.floor(v / 12);
  }

  return out.join("");
}

function toBase10Year(suazem: number) {
  return Math.round(suazem / SUAZEM_OVER_YEAR)
}

const SUAZEM_OVER_YEAR = 3/4; // in decimal years
const eraSuazemBase12 = computed(() => toBase12Suazem(eraSuazem.value));
const eraYearBase10 = computed(() => toBase10Year(eraSuazem.value));

const startSuazem = 288;
const endSuazem = 1500;
const tickInterval = 144;

// padding outside range
const startOffset = 144;  // years before start
const endOffset = 144;    // years after end

const visualStart = startSuazem - startOffset;
const visualEnd = endSuazem + endOffset;

/* ticks now fully dynamic with padding */
const ticks = computed(() => {
  const out = [];

  // align first tick to interval grid (important)
  const firstTick =
    Math.floor(visualStart / tickInterval) * tickInterval;

  for (let y = firstTick; y <= visualEnd; y += tickInterval) {
    out.push({
      year: y,
      label: toBase12Suazem(y),
      pos: ((y - visualStart) / (visualEnd - visualStart)) * 100
    });
  }

  return out;
});
</script>

<template>
  <div id="overlay">
    <div class="panel">
      <!-- ERA -->
      <div class="section">
        <div class="title">ERA</div>

        <div class="era-readout">
          <div class="era-duo">{{ eraSuazemBase12}} PS*</div>
          <div class="era-dec">({{eraYearBase10}} Decimal Years)</div>
          <div class="era-notes">*Potte Suázem <span class="ipa">/pat swazm̩/</span></div>
        </div>

        <div class="slider-wrap">
          <!-- ticks -->
          <div class="ticks">
            <div
              v-for="t in ticks"
              :key="t.year"
              class="tick"
              :style="{ left: t.pos + '%' }"
            >
              <button @click="eraSuazem = t.year">
                <div class="tick-line"></div>
                <div class="tick-label">{{ t.label }}</div>
              </button>
            </div>
          </div>

          <input
            type="range"
            :min="visualStart"
            :max="visualEnd"
            step="1"
            v-model="eraSuazem"
          />
        </div>
      </div>

      <!-- MODE -->
      <div class="section">
        <div class="title">MODE</div>
        <div class="segmented">
          <button :class="{active: mode==='political'}" @click="mode='political'">Political</button>
          <button :class="{active: mode==='physical'}" @click="mode='physical'">Physical</button>
          <button :class="{active: mode==='hybrid'}" @click="mode='hybrid'">Hybrid</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
:root {
  /* LIGHT (DATA MODE — matches your compass) */
  --panel-bg:
    linear-gradient(180deg, #f4f7fb, #dde6ef);

  --panel-border: #4b5a6a;

  --panel-glow:
    inset 0 0 0 1px rgba(255,255,255,.4),
    inset 0 0 12px rgba(0,0,0,.15),
    0 6px 14px rgba(0,0,0,.15);

  --panel-text: #1f2a35;
  --panel-accent: #3b82f6;

  --panel-muted: rgba(30,40,55,.6);

  --tick: rgba(40,55,70,.6);

  --button-bg: #e4ebf3;
  --button-border: rgba(60,80,100,.25);
  --button-active: #cfd8e3;
}

.dark {
  /* DARK (FANTASY MODE — keep your current feel) */
  --panel-bg:
    radial-gradient(circle at 25% 20%, rgba(255,255,255,.15), transparent 40%),
    linear-gradient(180deg, #3a2c1c, #1b140c);

  --panel-border: #a8843a;

  --panel-glow:
    inset 0 0 0 1px rgba(255,230,170,.15),
    inset 0 0 20px rgba(0,0,0,.5),
    0 10px 18px rgba(0,0,0,.45);

  --panel-text: #e6d2a4;
  --panel-accent: #f2d39a;

  --panel-muted: rgba(230,200,140,.6);

  --tick: rgba(230,200,140,.6);

  --button-bg: #2a1e12;
  --button-border: rgba(200,160,90,.3);
  --button-active: #5a4424;
}

/* ROOT */
#overlay {
  position: absolute;
  bottom: 18px;
  left: 18px;
  width: 240px;
  z-index: 999;
  pointer-events: none;
  user-select: none;
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
  font-size: 10px;
  opacity: 0.8;
}

.era-notes .ipa {
  font-family: "Lucida Sans Unicode", "DejaVu Sans", sans-serif;
  font-size: 10px;
  opacity: 0.6;
}

/* SLIDER */
.slider-wrap {
  position: relative;
  padding-top: 18px;
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
  left: 0;
  right: 0;
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