<script setup lang="ts">

import type { GuiNode, GuiLeaf, GuiParent, GuiChild, GuiTreeIdentifiable } from "./types/gui"

const props = defineProps<{
  node: GuiLeaf
}>()
</script>

<template>
  <input
    type="checkbox"
    :checked="node.enabled"
  />
</template>

<style scoped>input[type="checkbox"] {
  appearance: none;
  width: 1.1em;
  height: 1.1em;

  border: 1px solid #7a5c33;
  background: #f0e2bf;

  display: grid;
  place-content: center;

  cursor: pointer;
  border-radius: 2px;

  box-shadow: inset 0 0 2px rgba(0,0,0,0.15);

  transition: background 0.15s ease, border-color 0.15s ease, filter 0.15s ease;
}

/* hover (light) */
input[type="checkbox"]:hover {
  filter: brightness(1.05);
}

/* checked (light) */
input[type="checkbox"]:checked {
  background: #3b2a16;
  border-color: #3b2a16;
}

input[type="checkbox"]:checked::after {
  content: "✶";
  color: #f3ead6;
  font-size: 0.8em;
}

/* ========================= */
/* 🌙 DARK MODE OVERRIDES   */
/* ========================= */

.dark input[type="checkbox"] {
  border: 1px solid rgba(200, 160, 90, 0.35);
  background: linear-gradient(180deg, #3a2c1c, #241a10);

  box-shadow:
    inset 0 0 0 1px rgba(255, 220, 160, 0.08),
    inset 0 0 10px rgba(0, 0, 0, 0.6);
}

/* unchecked hover in dark mode */
.dark input[type="checkbox"]:hover {
  filter: brightness(1.15);
}

/* checked state in dark mode */
.dark input[type="checkbox"]:checked {
  background: #f0e0b8;
  border-color: rgba(240, 224, 184, 0.6);

  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.35),
    inset 0 0 8px rgba(255, 220, 160, 0.15);
}

.dark input[type="checkbox"]:checked::after {
  content: "✶";
  color: #2a1b0f;
  font-size: 0.8em;
}</style>