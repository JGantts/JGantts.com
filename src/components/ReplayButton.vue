<script setup lang="ts">
import { ref } from 'vue'
import { BackgroundState } from '../Curtain/Types'

import CirclePlayIcon from '../assets/icons/circle-play.svg'
import CirclePauseIcon from '../assets/icons/circle-pause.svg'
import PlayIcon from '../assets/icons/play.svg'
import PauseIcon from '../assets/icons/pause.svg'
import GithubIcon from '../assets/icons/github.svg'

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

const backgroundState = ref(BackgroundState.AfterFirstPaused)

const handleClick = async () => {
  emit('click')
 }

defineExpose({
  firstRunDone,
  backgroundState,
})
</script>

<template>
  <Transition name="spin">
    <button
      v-if="isVisible"
      @click.stop="handleClick"
      class="button-animation"
    >
        <div v-if="backgroundState === BackgroundState.AfterFirstPaused"
          key="0"
          class="play-button">
          <CirclePlayIcon class="fa-icon"/>
        </div>
        <div v-else-if="backgroundState === BackgroundState.AfterFirstLoading"
          class="play-button">
          <CirclePlayIcon class="fa-icon loading" />
        </div>
        <div v-else
          class="play-button">
          <CirclePauseIcon class="fa-icon" />
        </div>
    </button>
  </Transition>
</template>

<style scoped>
.spin-enter-active {
  animation: spin-in 0.75s cubic-bezier(0.58, 0.81, 0.62, 0.57);
  transform-origin: center;
}

@keyframes spin-in {
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

.loading {
  animation: spin-load 0.5s linear infinite;
}

@keyframes spin-load {
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(-360deg);
  }
}

.play-button {
  color: var(--textGrayOnBase);
  background-color: var(--backgroundAppBase);
  height: 1.15em;
  width: 1.15em;
  border-radius: 0.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fa-icon {
  padding: auto;
}
</style>

