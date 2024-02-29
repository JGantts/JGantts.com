<script setup lang="ts">
import { ref, onMounted } from 'vue'

import Curtain from '@/Curtain/Curtain.vue';

import {   
  theme_BlueDark_slate__Tomato_mauve,
  theme_Blue_slate__Orange_sand, 
} from '../Curtain/Themes'


const curtain1Ref = ref(null)
const curtain2Ref = ref(null)

const curtainHolder1Ref = ref(null)
const curtainHolder2Ref = ref(null)

const reload1 = async () => {
  console.log("1")
  let classList1 = curtainHolder1Ref.value?.classList
  let classList2 = curtainHolder2Ref.value?.classList

  if (!classList1 || !classList2) {
    console.log(curtainHolder1Ref.value)
    console.log(curtainHolder2Ref.value)
    console.log("ugh1")
  }

  classList1.remove("front-curtain")
  classList2.add("front-curtain")



  curtain2Ref.value?.reloadBackground()
}

const reload2 = async () => {
  console.log("2")
  let classList1 = curtainHolder1Ref.value?.classList
  let classList2 = curtainHolder2Ref.value?.classList

  if (!classList1 || !classList2) {
    console.log(curtainHolder1Ref.value)
    console.log(curtainHolder2Ref.value)
    console.log("ugh2")
  }

  classList2.remove("front-curtain")
  classList1.add("front-curtain")
  curtain1Ref.value?.reloadBackground()
}

onMounted(() => {
  reload1()
})

function reloadBackground() {

}

defineExpose({ reloadBackground })
</script>

<template>
  <div>
    <div
        class="curtain-holder"
        ref="curtainHolder1Ref">
      <Curtain
        class="curtain"
        ref="curtain1Ref"
        :theme-light="theme_BlueDark_slate__Tomato_mauve"
        :theme-dark="theme_Blue_slate__Orange_sand"
        @curtainCall="reload1"
      />
    </div>
    <div
        class="curtain-holder"
        ref="curtainHolder2Ref"
    >
      <Curtain
        class="curtain"
        ref="curtain2Ref"
        :theme-light="theme_Blue_slate__Orange_sand"
        :theme-dark="theme_BlueDark_slate__Tomato_mauve"
        @curtainCall="reload2"
      />
    </div>
  </div>
</template>

<style>
.curtain {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
.front-curtain {
  position: fixed;
  z-index: 0;
}
.front-curtain {
  z-index: 1;
}
</style>
