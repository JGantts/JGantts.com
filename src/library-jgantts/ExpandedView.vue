<template>
  <div
    class="component-main"
    ref="stackPanelRef"
  >
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineProps, computed, } from 'vue';

import { Breakpoint } from "../common/Breakpoint"

const props = defineProps({
  breakpoint: { type: Number, default: Breakpoint._2_M },
})

const stackPanelRef = ref(null)

onMounted(() => {
  //@ts-expect-error
  let style = stackPanelRef.value?.style;
  if (!style) {
    return;
  }
  style.setProperty('--display_0_XS', props.breakpoint <= Breakpoint._0_XS ? "contents" : "none" )
  style.setProperty('--display_1_S',  props.breakpoint <= Breakpoint._1_S  ? "contents" : "none" )
  style.setProperty('--display_2_M',  props.breakpoint <= Breakpoint._2_M  ? "contents" : "none" )
  style.setProperty('--display_3_L',  props.breakpoint <= Breakpoint._3_L  ? "contents" : "none" )
  style.setProperty('--display_4_XL', props.breakpoint <= Breakpoint._4_XL ? "contents" : "none" )
})
</script>

<style scoped>
.component-main {
  display: var(--display_0_XS);
}

@media (min-width: 481px) {
  .component-main {
    display: var(--display_1_S);
  }
}

@media (min-width: 769px) {
  .component-main {
    display: var(--display_2_M);
  }
}

@media (min-width: 1025px) {
  .component-main {
    display: var(--display_3_L);
  }
}

@media (min-width: 1201px) {
  .component-main {
    display: var(--display_4_XL);
  }
}
</style>
