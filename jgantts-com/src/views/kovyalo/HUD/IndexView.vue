<script setup lang="ts">
import type { JgMap } from '../maps/maps';
import DarkModeButton from './DarkModeButton.vue';
import LabelModeSelect from './LabelModeSelect.vue';
import FullscreenButton from './FullscreenButton.vue';
import GuiView from './GuiView/GuiView.vue';
import CompassView from './CompassView.vue';
import { ref } from 'vue';

const props = defineProps<{
  map: JgMap
  fullscreenTarget: HTMLElement | null
}>()

defineExpose({
    updateHud,
});

const compass = ref<InstanceType<typeof CompassView> | null>(null)
const openPanel = ref<'layers' | 'settings' | null>(null)

function togglePanel(panel: 'layers' | 'settings') {
    openPanel.value = openPanel.value === panel ? null : panel
}

function updateHud() {
    compass.value?.updateCompass()
}
</script>

<template>
    <div id="hud-holder" @keydown.esc="openPanel = null">
        <nav class="mobile-toolbar" aria-label="Map controls">
            <button type="button" :aria-expanded="openPanel === 'layers'" aria-controls="map-layers" @click="togglePanel('layers')">Layers</button>
            <button type="button" :aria-expanded="openPanel === 'settings'" aria-controls="map-settings" @click="togglePanel('settings')">Settings</button>
        </nav>
        <div id="map-layers" class="layers-panel" :class="{ 'is-open': openPanel === 'layers' }">
            <GuiView :map="map" />
        </div>
        <div id="right-col">
            <div id="map-settings" class="settings-panel" :class="{ 'is-open': openPanel === 'settings' }">
                <FullscreenButton :target="fullscreenTarget" @resize="map.mlMap.resize()" />
                <DarkModeButton />
                <LabelModeSelect />
            </div>
            <CompassView ref="compass" :map="map" />
        </div>
    </div>
</template>

<style scoped>
#hud-holder {
    pointer-events: none;
    position: absolute;
    inset: 0;
    padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
    z-index: 999;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font: 400 14px/1.3 system-ui, sans-serif;
}
.layers-panel {
    min-width: 0;
    align-self: flex-start;
    max-height: 100%;
    overflow: auto;
    overscroll-behavior: contain;
    pointer-events: auto;
}
#right-col,
.settings-panel {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
    min-width: 0;
}
.mobile-toolbar { display: none; }

@media (max-width: 640px), (max-height: 500px) {
    .mobile-toolbar {
        display: flex;
        align-self: flex-start;
        gap: 8px;
        pointer-events: auto;
    }
    .mobile-toolbar button {
        min-height: 44px;
        padding: 8px 14px;
        border: 1px solid var(--panel-border);
        border-radius: 8px;
        background: var(--panel-bg);
        color: var(--panel-text);
        font: 600 14px/1.3 system-ui, sans-serif;
        box-shadow: 0 2px 8px #0003;
    }
    .mobile-toolbar button[aria-expanded="true"] { background: var(--button-active); }
    .mobile-toolbar button:focus-visible { outline: 2px solid var(--panel-text); outline-offset: 2px; }
    .layers-panel,
    .settings-panel {
        display: none;
        position: absolute;
        top: calc(max(12px, env(safe-area-inset-top)) + 76px);
        left: max(12px, env(safe-area-inset-left));
        right: max(12px, env(safe-area-inset-right));
        max-height: calc(100% - max(12px, env(safe-area-inset-top)) - max(12px, env(safe-area-inset-bottom)) - 88px);
        overflow: auto;
        overscroll-behavior: contain;
        pointer-events: auto;
        border-radius: 12px;
    }
    .layers-panel.is-open { display: block; }
    .layers-panel :deep(#overlay) { width: 100%; }
    .settings-panel.is-open { display: flex; }
    .settings-panel {
        align-items: stretch;
        padding: 12px;
        border: 1px solid var(--panel-border);
        background: var(--panel-bg);
        box-shadow: var(--panel-glow);
    }
    .settings-panel :deep(.fullscreen-control) { align-items: flex-start; }
    .settings-panel :deep(button),
    .settings-panel :deep(select) { min-height: 44px; }
    .settings-panel :deep(.label-mode) { flex-wrap: wrap; }
    .settings-panel :deep(select) { flex: 1; max-width: 100%; font-size: 16px; }
}
</style>
