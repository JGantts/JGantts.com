<script setup lang="ts">
import { ref, onMounted } from 'vue'

import Curtain from '@/Curtain/Curtain.vue';

import {   
  theme_BlueDark_slate__Tomato_mauve,
  theme_Blue_slate__Orange_sand, 
} from '../Curtain/Themes'

const reloadBackground = () => {
  curtainRef.re
}

const curtainRef = ref(null)

defineExpose({ reloadBackground })
</script>

<template>
  <!--<Curtain
    id="background" ref="backgroundRef"
    :theme-light="theme_BlueDark_slate__Tomato_mauve"
    :theme-dark="theme_Blue_slate__Orange_sand"
  />-->
  <Curtain
    id="background"
    ref="curtainRef"
    :theme-light="theme_Blue_slate__Orange_sand"
    :theme-dark="theme_BlueDark_slate__Tomato_mauve"
  />
</template>

<style>

</style>