<script setup lang="ts">
import { ref, onMounted, defineProps, } from 'vue';

const props = defineProps<{
  cornerRadius: String;
}>()
</script>

<template>
  <div class="main shadow" :style="{ borderRadius: props.cornerRadius + '' }">
    <slot />
  </div>
</template>

<style scoped>
.main {
  --flex-alignment: center;
  --indent-left: 1;
  --indent-right: 1;
  align-items: center;
  display: flex;
  flex-grow: 0;
  flex-shrink: 0;
  justify-content: center;
  max-width: 100%;
  position: relative;
  text-align: center;
  z-index: 1;
  border-radius: var(--border-radius);
}

.main > .inner {
  border-radius: var(--border-radius-tl) var(--border-radius-tr)
    var(--border-radius-br) var(--border-radius-bl);
  max-width: 100%;
  position: relative;
  width: var(--width);
  z-index: 1;
  padding: var(--padding-vertical) var(--padding-horizontal);
}

.main > .inner > * {
  margin-top: var(--spacing);
  margin-bottom: var(--spacing);
}

.main > .inner > :first-child {
  margin-top: 0 !important;
}

.main > .inner > :last-child {
  margin-bottom: 0 !important;
}

.main > .inner > .full {
  margin-left: calc(var(--padding-horizontal) * -1);
  max-width: calc(100% + calc(var(--padding-horizontal) * 2) + 0.4725px);
  width: calc(100% + calc(var(--padding-horizontal) * 2) + 0.4725px);
}

.main > .inner > .full:first-child {
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
  margin-top: calc(var(--padding-vertical) * -1) !important;
}

.main > .inner > .full:last-child {
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
  margin-bottom: calc(var(--padding-vertical) * -1) !important;
}

.main > .inner > .full.screen {
  border-radius: 0 !important;
  max-width: 100vw;
  position: relative;
  width: 100vw;
  left: 50%;
  margin-left: -50vw;
  right: auto;
}

.main > .inner {
  --padding-horizontal: 0;
  --padding-vertical: 0;
  --spacing: 0rem;
  --width: var(--widthSW1);
  --padding-horizontal: var(--padding-horizontalSW1);
  --padding-vertical: var(--padding-verticalSW1);
}

@media (max-width: 736px) {
  .main > .inner {
    --spacing: 0rem;
    --width: var(--widthSW2);
    --padding-horizontal: var(--padding-horizontalSW2);
    --padding-vertical: var(--padding-verticalSW2);
  }
}

@media (max-width: 480px) {
  .main > .inner {
    --spacing: 0rem;
    --width: var(--widthSW3);
    --padding-horizontal: var(--padding-horizontalSW3);
    --padding-vertical: var(--padding-verticalSW3);
  }
}

@media (max-width: 360px) {
  .main > .inner {
    --spacing: 0rem;
    --width: var(--widthSW4);
    --padding-horizontal: var(--padding-horizontalSW4);
    --padding-vertical: var(--padding-verticalSW4);
  }
}
</style>