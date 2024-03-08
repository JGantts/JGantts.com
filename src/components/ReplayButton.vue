<script setup lang="ts">
import { ref } from 'vue'
import { BackgroundState } from '../Curtain/Types'

import PlayIcon from '../assets/icons/play.svg'
import PauseIcon from '../assets/icons/pause.svg'

const sleep = (ms: number|undefined) => {
  return new Promise(resolve => setTimeout(resolve, ms || 2000));
}

const isVisible = ref(false)

const emit = defineEmits([
  'click',
]);

const firstRunDone = () => {
  isVisible.value = true
}

const state = ref(BackgroundState.AfterFirstPaused)
const clicked = ref(false)

const handleClick = async () => {
  emit('click')
  clicked.value = true
  await sleep(100)
  clicked.value = false
}

defineExpose({ 
  state,
  firstRunDone
})
</script>

<template>
    <button
      v-if="isVisible"
      @click.stop="handleClick"
      class="button-animation"
      :class="{ 'click-animation': clicked }"
      :disabled="clicked"
    >
      <div
        v-if="state === BackgroundState.AfterFirstPaused"
        class="play-button">
        <PlayIcon class="fa-icon"/>
      </div>
      <div
        v-else
        class="play-button">
        <PauseIcon class="fa-icon" />
      </div>
    </button>
</template>


<style scoped>
@keyframes the-anim {
  0% {
    transform: rotate(-720deg) scale(0);
    opacity: 0;
  }
  50% {
    transform: rotate(-360deg) scale(1);
  }
  75% {
    opacity: 1;
    transform: rotate(-180deg) scale(1.5);
  }
  87.5% {
    transform: rotate(-90deg) scale(1.4);
  }
  100% {
    transform: rotate(0deg) scale(1.0);
  }
}

.button-animation {
  animation: the-anim 0.75s cubic-bezier(0.58, 0.81, 0.62, 0.57);
}

.play-button {
  color: var(--textGrayOnBase);
  background-color: var(--backgroundAppBase);
  height: 1.15em;
  width: 1.15em;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fa-icon {
  padding: auto;
}
</style>

