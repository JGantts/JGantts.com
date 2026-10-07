<script setup lang="ts">
import { useSettings } from '../common/Settings'

const settings = useSettings()
</script>

<template>
  <label class="label-mode">
    Labels
    <select v-model="settings.labelMode">
      <option value="both">Native + Latin</option>
      <option value="native">Native</option>
      <option value="nativeHangul">Native + Hangul</option>
      <option value="latin">Latin</option>
      <option value="hangul">Hangul</option>
    </select>
  </label>
</template>

<style scoped>
.label-mode {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 7px 12px;
  border: 1px solid rgba(90, 60, 25, 0.35);
  border-radius: 6px;
  background: #e9dbc0;
  color: #2a1b0f;
  font: 600 13px system-ui, sans-serif;
}
select {
  min-width: 0;
  font: inherit;
  color: inherit;
  background: inherit;
  border-radius: 3px;
}
.dark .label-mode {
  background: #3a2c1c;
  color: #f0e0b8;
  border-color: rgba(200, 160, 90, 0.35);
}
</style>
