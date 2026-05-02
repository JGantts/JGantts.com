<script setup lang="ts">
import { useDarkMode } from './common/DarkMode';

const darkMode = useDarkMode()
</script>

<template>
<div id="overlay">
    <button
      @click="darkMode.toggleUserTheme"
      style="margin-right: 8px;"
    >
      {{
        darkMode.darkModeUser.value === 'auto' 
          ? 'Auto' 
          : darkMode.darkModeUser.value === 'dark' 
            ? 'Dark' 
            : 'Light'
      }}
    </button>
    <button v-if="darkMode.darkModeUser.value !== 'auto'" @click="darkMode.clearUserTheme">
      X
    </button>
</div>
</template>

<style scoped>
#overlay {
  position: absolute;
  top: 18px;
  left: 18px;
  width: 240px;
  z-index: 999;
  pointer-events: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

button {
  pointer-events: auto;
  padding: 8px 12px;
  background-color: rgba(255,255,255,0.8);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>