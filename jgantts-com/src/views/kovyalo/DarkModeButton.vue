<script setup lang="ts">
import { computed } from "vue"
import { toggleUserTheme, clearUserTheme } from './common/DarkMode'
import { useSettings } from './common/Settings'

const settings = useSettings()

// label = what user selected, not effective mode
const themeLabel = computed(() => {
  const v = settings.darkMode
  if (v === "auto") return "Auto"
  if (v === "dark") return "Dark"
  return "Light"
})
</script>

<template>
  <div id="overlay">
    <button class="theme-btn" @click="toggleUserTheme">
      Theme: {{ themeLabel }}
    </button>

    <button
      v-if="settings.darkMode !== 'auto'"
      class="reset-btn"
      @click="clearUserTheme"
      title="Reset to system theme"
    >
      Reset
    </button>
  </div>
</template>

<style scoped>
#overlay {
  position: absolute;
  bottom: 18px;
  left: 18px;
  width: 240px;
  z-index: 999;
  pointer-events: none;

  user-select: none;
}

/* shared button base (becomes “engraved metal plate”) */
button {
  pointer-events: auto;

  padding: 7px 12px;
  margin-right: 8px;

  border-radius: 6px;
  cursor: pointer;

  font-family: system-ui, sans-serif;
  font-weight: 600;
  letter-spacing: 0.3px;

  transition: transform 0.08s ease, filter 0.15s ease;
}

/* click feel */
button:active {
  transform: translateY(1px);
}
</style>

<style scoped>
:root button {
  background:
    linear-gradient(180deg, #e9dbc0, #d8c08a);

  color: #2a1b0f;

  border: 1px solid rgba(90,60,25,.35);

  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.25),
    inset 0 0 10px rgba(60,40,20,.15),
    0 3px 8px rgba(0,0,0,.15);
}

:root button:hover {
  filter: brightness(1.05);
}

.dark button {
  background:
    linear-gradient(180deg, #3a2c1c, #241a10);

  color: #f0e0b8;

  border: 1px solid rgba(200,160,90,.35);

  box-shadow:
    inset 0 0 0 1px rgba(255,220,160,.12),
    inset 0 0 14px rgba(0,0,0,.55),
    0 6px 14px rgba(0,0,0,.5);
}

.dark button:hover {
  filter: brightness(1.1);
}
</style>