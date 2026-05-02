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

const SUAZEM_OVER_YEAR = 4/3; // in decimal years
const eraSuazemBase12 = computed(() => toBase12Suazem(eraSuazem.value));
const eraYearBase10 = computed(() => toBase10Year(eraSuazem.value));

const startSuazem = 144*3;
const endSuazem = 144*16;

const tickPlacements: {
  suazem: string,
  label: string
}[] = [
  { suazem: "526", label: "War of Plotto" },
  { suazem: "864", label: "Age of Aegat" },
  { suazem: "1400", label: "Modern"}
]


/* ticks now fully dynamic with padding */
const ticks = computed(() => {
  const out = [];

  for (let suazem of tickPlacements) {
    let suazemDecimal = Number.parseInt(suazem.suazem, 12)
    out.push({
      year: suazemDecimal,
      label: suazem.label,
      hover: toBase12Suazem(suazemDecimal),
      pos: ((suazemDecimal - startSuazem) / (endSuazem - startSuazem)) * 100
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
            :min="startSuazem"
            :max="endSuazem"
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
  max-width: 5em;
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