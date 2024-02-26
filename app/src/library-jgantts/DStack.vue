<template>
  <div
    class="stack-panel"
    ref="stackPanelRef"
    :style="{
      gap: props.spacing,
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
  spacing: { type: String, default: "0" },
})

const stackPanelRef = ref(null)

onMounted(() => {
    stackPanelRef.value?.style.setProperty('--layoutDir_0_XS', props.breakpoint <= Breakpoint._0_XS ? "row" : "column" )
    stackPanelRef.value?.style.setProperty('--layoutDir_1_S',  props.breakpoint <= Breakpoint._1_S  ? "row" : "column" )
    stackPanelRef.value?.style.setProperty('--layoutDir_2_M',  props.breakpoint <= Breakpoint._2_M  ? "row" : "column" )
    stackPanelRef.value?.style.setProperty('--layoutDir_3_L',  props.breakpoint <= Breakpoint._3_L  ? "row" : "column" )
    stackPanelRef.value?.style.setProperty('--layoutDir_4_LS', props.breakpoint <= Breakpoint._4_XL ? "row" : "column" )
})
</script>

<style scoped>
.stack-panel {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--spacing);
}

.stack-panel {
  flex-direction: var(--layoutDir_0_XS);
}

@media (min-width: 481px) {
  .stack-panel {
    flex-direction: var(--layoutDir_1_S);
  }
}

@media (min-width: 769px) {
  .stack-panel {
    flex-direction: var(--layoutDir_2_M);
  }
}

@media (min-width: 1025px) {
  .stack-panel {
    flex-direction: var(--layoutDir_3_L);
  }
}

@media (min-width: 1201px) {
  .stack-panel {
    flex-direction: var(--layoutDir_4_LS);
  }
}
</style>
