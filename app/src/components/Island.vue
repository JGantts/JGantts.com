<script setup lang="ts">
import { ref, onMounted, defineProps, } from 'vue';
import { IslandSize } from './IslandSize';

const myRoot = ref(null)

const props = defineProps<{
  size: IslandSize;
}>()

onMounted(() => {
  let constValues = {
    small: {
      borderRadius: ".5rem",
      widthSW1: "9rem",
      widthSW2: "11rem",
      widthSW3: "11rem",
      widthSW4: "11rem",
    },
    medium: {
      borderRadius: "1.5rem",
      widthSW1: "20rem",
      widthSW2: "20rem",
      widthSW3: "100%",
      widthSW4: "100%",
    },
    large: {
      borderRadius: "1.5rem",
      widthSW1: "15rem",
      widthSW2: "15rem",
      widthSW3: "15rem",
      widthSW4: "15rem",
    },
  }

  let specificConst = null

  switch (props.size) {
    case IslandSize.Small:
      specificConst = constValues.small
      break
    case IslandSize.Medium:
      specificConst = constValues.medium
      break
    case IslandSize.Large:
      specificConst = constValues.large
      break
    default:
      console.log("err")
      console.log(props.size)
      console.log(IslandSize.Large)
      specificConst = constValues.small
      break
  }

  myRoot.value?.style?.setProperty('--border-radius', specificConst.borderRadius)
  myRoot.value?.style?.setProperty('--widthSW1', specificConst.widthSW1)
  myRoot.value?.style?.setProperty('--widthSW2', specificConst.widthSW2)
  myRoot.value?.style?.setProperty('--widthSW3', specificConst.widthSW3)
  myRoot.value?.style?.setProperty('--widthSW4', specificConst.widthSW4)
})

</script>

<template>
  <div class="main" ref="myRoot">
    <div class="inner">
      <div id="container03" class="container default full">
        <div class="wrapper">
          <div class="inner">
            <slot />
          </div>
        </div>
      </div>
    </div>
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
}

@media (max-width: 736px) {
  .main > .inner {
    --padding-horizontal: 0;
    --padding-vertical: 0;
    --spacing: 0rem;
    --width: var(--widthSW2);
  }
}

@media (max-width: 480px) {
  .main > .inner {
    --spacing: 0rem;
    --width: var(--widthSW3);
  }
}

@media (max-width: 360px) {
  .main > .inner {
    --padding-horizontal: 0;
    --padding-vertical: 0;
    --spacing: 0rem;
    --width: var(--widthSW4);
  }
}
</style>