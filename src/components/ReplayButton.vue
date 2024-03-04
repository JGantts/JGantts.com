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
    <button @click.stop="$emit('click')" v-show="isVisible">
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
button {
  transition: opacity 0.5s ease-in-out;;
  
}

button[v-show] {
  opacity: 1;
}
</style>