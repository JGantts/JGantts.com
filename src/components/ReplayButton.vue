<script setup lang="ts">
import { ref } from 'vue'
import { BackgroundState } from '../Curtain/Types'

import PlayIcon from '../assets/icons/play.svg'
import PauseIcon from '../assets/icons/pause.svg'

const isVisible = ref(false)

const emit = defineEmits([
  'click',
]);

const firstRunDone = () => {
  isVisible.value = true
}

const state = ref(BackgroundState.AfterFirstPaused)

defineExpose({ 
  state,
  firstRunDone
})
</script>

<template>
  <button @click.stop="$emit('click')" v-if="isVisible" class="button-animation play-button">
    <div v-if="state === BackgroundState.AfterFirstPaused" class="play-button">
      <PlayIcon class="fa-icon"/>
    </div>
    <div v-else  class="play-button">
      <PauseIcon class="fa-icon" />
    </div>
  </button>
</template>


<style scoped>
@keyframes the-anim {
  0% {
    transform: rotate(-720deg) scale(0.2);
    opacity: 0;
  }
  50% {
    transform: rotate(-360deg) scale(0.6);
  }
  75% {
    opacity: 1;
  }
  100% {
    transform: rotate(0deg);
  }
}

.button-animation {
  animation: 
    the-anim 0.6s;
}

.play-button {
  color: var(--textGrayOnBase);
  background-color: var(--backgroundAppBase);
  height: 1.1em;
  width: 1.1em;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;  
}

.fa-icon {
  padding: auto;
}
</style>

