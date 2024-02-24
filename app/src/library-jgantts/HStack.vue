<template>
  <div class="stack-panel" :style="{ '--gap': gap }">
    <slot></slot>
  </div>
</template>

<script setup>
import { ref } from 'vue'

let gap = ref('10px')

</script>

<style scoped>
.stack-panel {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: var(--gap);
}
</style>
