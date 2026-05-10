<script setup lang="ts">
import type { JgMap } from '../maps/maps';
import DarkModeButton from './DarkModeButton.vue';
import GuiView from './GuiView/GuiView.vue';
import CompassView from './CompassView.vue';
import { ref } from 'vue';

const props = defineProps<{
  map: JgMap
}>()

defineExpose({
    updateHud,
});

const compass = ref<typeof CompassView | null>(null)

function updateHud() {
    console.log(compass.value)
    compass.value?.updateCompass()
}
</script>

<template>
    <div id="hud-holder">
        <GuiView class="gui-view" :map="map" />
        <div id="right-col">
            <DarkModeButton class="dark-mode-button" />
            <CompassView ref="compass" class="compass-view" :map="map" />
        </div>
    </div>
</template>

<style scoped>
#hud-holder {
    pointer-events: none;

    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 1em;
    z-index: 999;

    display: flex;
    flex-direction: row;
    justify-content: space-between;
}

.gui-view {
    top: 0;
    left: 0;
}

#right-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    gap: 1em;
}
</style>