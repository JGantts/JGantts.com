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
  console.log('hi')
  isVisible.value = true
}

const state = ref(BackgroundState.AfterFirstPaused)

defineExpose({ 
  state,
  firstRunDone
})
</script>

<template>
  <div class="secondary">
    <button @click.stop="$emit('click')" v-if="isVisible" class="button-animation">
      <div v-if="state === BackgroundState.AfterFirstPaused" >
        <PlayIcon class="fa-icon" />
      </div>
      <div v-else>
        <PauseIcon class="fa-icon" />
      </div>
    </button>
  </div>
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
</style>

