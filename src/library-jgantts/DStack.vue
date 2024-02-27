<template>
  <div
    class="stack-panel"
    ref="stackPanelRef"
    :style="{
      '--h-spacing': props.hSpacing,
      '--v-spacing': props.vSpacing,
      padding: props.padding,
      '--breakpoint': props.breakpoint,
    }"
  >
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineProps, computed, } from 'vue';

import { Breakpoint } from "../common/Breakpoint"

const props = defineProps({
  breakpoint: { type: Number, default: Breakpoint._2_M },
  padding: { type: String, default: "0" },
  hSpacing: { type: String, default: "0" },
  vSpacing: { type: String, default: "0" },
})

const stackPanelRef = ref(null)

onMounted(() => {
  //@ts-expect-error
  let style = stackPanelRef.value?.style;
  if (!style) {
    return;
  }
  style.setProperty('--layoutDir_0_XS', props.breakpoint <= Breakpoint._0_XS ? "row" : "column" )
  style.setProperty('--layoutDir_1_S',  props.breakpoint <= Breakpoint._1_S  ? "row" : "column" )
  style.setProperty('--layoutDir_2_M',  props.breakpoint <= Breakpoint._2_M  ? "row" : "column" )
  style.setProperty('--layoutDir_3_L',  props.breakpoint <= Breakpoint._3_L  ? "row" : "column" )
  style.setProperty('--layoutDir_4_XL', props.breakpoint <= Breakpoint._4_XL ? "row" : "column" )

  style.setProperty('--spacing_0_XS', props.breakpoint <= Breakpoint._0_XS ? props.hSpacing : props.vSpacing )
  style.setProperty('--spacing_1_S',  props.breakpoint <= Breakpoint._1_S  ? props.hSpacing : props.vSpacing )
  style.setProperty('--spacing_2_M',  props.breakpoint <= Breakpoint._2_M  ? props.hSpacing : props.vSpacing )
  style.setProperty('--spacing_3_L',  props.breakpoint <= Breakpoint._3_L  ? props.hSpacing : props.vSpacing )
  style.setProperty('--spacing_4_XL', props.breakpoint <= Breakpoint._4_XL ? props.hSpacing : props.vSpacing )
})
</script>

<style scoped>
.stack-panel {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.stack-panel {
  flex-direction: var(--layoutDir_0_XS);
  gap: var(--spacing_0_XS);
}

@media (min-width: 481px) {
  .stack-panel {
    flex-direction: var(--layoutDir_1_S);
    gap: var(--spacing_1_S);
  }
}

@media (min-width: 769px) {
  .stack-panel {
    flex-direction: var(--layoutDir_2_M);
    gap: var(--spacing_2_M);
  }
}

@media (min-width: 1025px) {
  .stack-panel {
    flex-direction: var(--layoutDir_3_L);
    gap: var(--spacing_3_L);
  }
}

@media (min-width: 1201px) {
  .stack-panel {
    flex-direction: var(--layoutDir_4_XL);
    gap: var(--spacing_4_XL);
  }
}
</style>
