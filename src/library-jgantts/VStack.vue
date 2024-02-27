<template>
  <div
    class="stack-panel"
    :style="{ gap: props.spacing, padding: props.padding }"
  >
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, } from 'vue';

const props = defineProps({
  padding: { type: String, default: "0" },
  spacing: { type: String, default: "0" },
})
</script>

<style scoped>
.stack-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: var(--spacing);
}
</style>
