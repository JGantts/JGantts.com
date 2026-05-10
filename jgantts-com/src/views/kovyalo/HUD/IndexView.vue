<script setup lang="ts">
import type { JgMap } from '../maps/maps';
import DarkModeButton from './DarkModeButton.vue';
import GuiView from './GuiView/GuiView.vue';
import CompassView from './CompassView.vue';

const props = defineProps<{
  map: JgMap
}>()
</script>

<template>
     <DarkModeButton />
      <GuiView :map="map" />
      <CompassView ref="compassView" id="compass" :map="map" />
</template>

<style scoped>

</style>