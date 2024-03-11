<script setup lang="ts">
import { ref, onMounted } from 'vue'

import Curtain from '../Curtain/Curtain.vue';

import { RainbowDirection, type Color, type Rainbow } from '../Curtain/Types';

import {
  bronze,
  bronzeDark,

  // Mauve
  mauve,
  mauveDark,

  tomato,
  tomatoDark,
  red,
  redDark,
  crimson,
  crimsonDark,
  plum,
  plumDark,
  violet,
  violetDark,
  purple,
  purpleDark,
  ruby,
  rubyDark,

  // Slate
  slate,
  slateDark,

  iris,
  irisDark,
  indigo,
  indigoDark,
  blue,
  blueDark,
  sky,
  skyDark,
  cyan,
  cyanDark,

  // Sage
  sage,
  sageDark,

  mint,
  mintDark,
  teal,
  tealDark,
  jade,
  jadeDark,
  green,
  greenDark,

  // Olive
  olive,
  oliveDark,

  grass,
  grassDark,
  lime,
  limeDark,

  // Sand
  sand,
  sandDark,

  yellow,
  yellowDark,
  amber,
  amberDark,
  orange,
  orangeDark,
pink,

} from '@radix-ui/colors';

let colorsCycleIndex = 0
const colorsCycle: Rainbow[] = [
  {
    name: "blue",
    dir: RainbowDirection.Regular,
    stops: [
      { stop: 0, color: hslToComponents(sky.sky10) },
      { stop: 0.45, color: hslToComponents(blue.blue10) },
      { stop: 0.5, color: hslToComponents(blue.blue10) },
      { stop: 0.6, color: hslToComponents(blue.blue10) },
      { stop: 1, color: hslToComponents(grass.grass10) },
    ],
  },
  {
    name: "orange",
    dir: RainbowDirection.Regular,
    stops: [
      { stop: 0, color: hslToComponents(orange.orange8) },
      { stop: 0.45, color: hslToComponents(tomato.tomato10) },
      //{ stop: 0.5, color: hslToComponents(tomato.tomato9) },
      { stop: 0.6, color: hslToComponents(red.red10) },
      { stop: 1, color: hslToComponents(ruby.ruby11) },
    ],
  },
  {
    name: "purple",
    dir: RainbowDirection.Regular,
    stops: [
      { stop: 0, color: hslToComponents(purple.purple8) },
      { stop: 0.45, color: hslToComponents(crimson.crimson10) },
      { stop: 0.55, color: hslToComponents(crimson.crimson10) },
      { stop: 0.6, color: hslToComponents(pink.pink10) },
      { stop: 1, color: hslToComponents(plum.plum12) },
    ],
  },
  {
    name: "mint",
    dir: RainbowDirection.Regular,
    stops: [
      { stop: 0, color: hslToComponents(mint.mint9) },
      { stop: 0.45, color: hslToComponents(lime.lime9) },
      { stop: 0.55, color: hslToComponents(lime.lime10) },
      { stop: 1, color: hslToComponents(green.green10) },
    ],
  },
  {
    name: "orange2",
    dir: RainbowDirection.Regular,
    stops: [
      { stop: 0, color: hslToComponents(orange.orange7) },
      { stop: 1, color: hslToComponents(crimson.crimson9) },
    ],
  },
  {
    name: "green-red",
    dir: RainbowDirection.Regular,
    stops: [
      { stop: 0, color: hslToComponents(green.green8) },
      { stop: 1, color: hslToComponents(crimson.crimson10) },
    ],
  },
  {
    name: "crimson-green",
    dir: RainbowDirection.Regular,
    stops: [
      { stop: 0, color: hslToComponents(crimson.crimson10) },
      { stop: 0.5, color: hslToComponents(crimson.crimson10) },
      { stop: 1, color: hslToComponents(green.green8) },
    ],
  },
  {
    name: "green-purple",
    dir: RainbowDirection.Regular,
    stops: [
      { stop: 0, color: hslToComponents(green.green8) },
      { stop: 0.5, color: hslToComponents(teal.teal10) },
      { stop: 1, color: hslToComponents(purple.purple10) },
    ],
  },
  /*{
      dir: RainbowDirection.Regular,
      stops: [
        { stop: 0, color: hslToComponents(purple.purple9) },
        { stop: 0.45, color: hslToComponents(blue.blue9) },
        { stop: 0.5, color: hslToComponents(blue.blue10) },
        { stop: 0.6, color: hslToComponents(blue.blue11) },
        { stop: 1, color: hslToComponents(red.red11) },
      ],
    curve: {
      pos: { low: -300, high: 0 },
      velo: { low: 0, high: 5 },
      acc: { low: 5, high: 10 },
      jolt: { low: -5, high: 5 },
    },
  },*/

  /*[
    { stop: 0, color: hslToComponents(sky.sky9) },
    { stop: 0.45, color: hslToComponents(blue.blue9) },
    { stop: 0.5, color: hslToComponents(blue.blue10) },
    { stop: 0.6, color: hslToComponents(blue.blue11) },
    { stop: 1, color: hslToComponents(jade.jade11) },
  ],
  [
    { stop: 0, color: hslToComponents(cyan.cyan9) },
    { stop: 0.45, color: hslToComponents(teal.teal9) },
    { stop: 0.5, color: hslToComponents(teal.teal10) },
    { stop: 0.6, color: hslToComponents(teal.teal11) },
    { stop: 1, color: hslToComponents(indigo.indigo11) },
  ],
  [
    { stop: 0, color: hslToComponents(purple.purple8) },
    { stop: 0.45, color: hslToComponents(purple.purple9) },
    { stop: 0.5, color: hslToComponents(purple.purple10) },
    { stop: 0.6, color: hslToComponents(purple.purple10) },
    { stop: 1, color: hslToComponents(purple.purple12) },
  ],
  [
    { stop: 0, color: hslToComponents(ruby.ruby8) },
    { stop: 0.45, color: hslToComponents(ruby.ruby9) },
    { stop: 0.5, color: hslToComponents(ruby.ruby10) },
    { stop: 0.6, color: hslToComponents(ruby.ruby11) },
    { stop: 1, color: hslToComponents(ruby.ruby12) },
  ],
  [
    { stop: 0, color: hslToComponents(iris.iris8) },
    { stop: 0.45, color: hslToComponents(iris.iris9) },
    { stop: 0.5, color: hslToComponents(iris.iris10) },
    { stop: 0.6, color: hslToComponents(iris.iris11) },
    { stop: 1, color: hslToComponents(iris.iris12) },
  ],
  [
    { stop: 0, color: hslToComponents(teal.teal8) },
    { stop: 0.45, color: hslToComponents(teal.teal9) },
    { stop: 0.5, color: hslToComponents(teal.teal10) },
    { stop: 0.6, color: hslToComponents(teal.teal11) },
    { stop: 1, color: hslToComponents(teal.teal12) },
  ],
  [
    { stop: 0, color: hslToComponents(green.green8) },
    { stop: 0.45, color: hslToComponents(green.green9) },
    { stop: 0.5, color: hslToComponents(green.green10) },
    { stop: 0.6, color: hslToComponents(green.green11) },
    { stop: 1, color: hslToComponents(green.green12) },
  ],
  [
    { stop: 0, color: hslToComponents(red.red8) },
    { stop: 0.45, color: hslToComponents(red.red9) },
    { stop: 0.5, color: hslToComponents(red.red10) },
    { stop: 0.6, color: hslToComponents(red.red10) },
    { stop: 1, color: hslToComponents(red.red12) },
  ],
  [
    { stop: 0, color: hslToComponents(tomato.tomato8) },
    { stop: 0.45, color: hslToComponents(tomato.tomato9) },
    { stop: 0.5, color: hslToComponents(tomato.tomato10) },
    { stop: 0.6, color: hslToComponents(tomato.tomato11) },
    { stop: 1, color: hslToComponents(tomato.tomato12) },
  ],
  [
    { stop: 0, color: hslToComponents(orange.orange8) },
    { stop: 0.45, color: hslToComponents(orange.orange9) },
    { stop: 0.5, color: hslToComponents(orange.orange10) },
    { stop: 0.6, color: hslToComponents(orange.orange10) },
    { stop: 1, color: hslToComponents(orange.orange12) },
  ],
  [
    { stop: 0, color: hslToComponents(yellow.yellow8) },
    { stop: 0.45, color: hslToComponents(yellow.yellow9) },
    { stop: 0.5, color: hslToComponents(yellow.yellow10) },
    { stop: 0.6, color: hslToComponents(yellow.yellow10) },
    { stop: 1, color: hslToComponents(yellow.yellow12) },
  ],*/
]

function hslToComponents(hsl: string): Color {
  const splitA = hsl.split(',')
  const hue = splitA[0].split('(')[1]
  const saturation = splitA[1].split('%')[0]
  const lightness = splitA[2].split('%')[0]
  const color = {
    hue: Number(hue),
    saturation: Number(saturation),
    lightness: Number(lightness),
  }
  return color
}

const curtainRef = ref(null)

const curtainHolderRef = ref(null)

const reload = async () => {
  loadNext(
    curtainHolderRef.value,
    curtainRef.value,
  )
}


enum BackgroundState {
  Prerun,
  Firstrun,
  Secondrun,
  Subseqrun,
}
let backgroundState = BackgroundState.Prerun
async function loadNext(
  element: Element|null,
  //@ts-expect-error
  curtain: Curtain|null,
) {
  switch (backgroundState) {
    case BackgroundState.Prerun:
      backgroundState = BackgroundState.Firstrun
    break
    case BackgroundState.Firstrun:
      backgroundState = BackgroundState.Secondrun
      emit('firstRunDone')
      return
    case BackgroundState.Secondrun:
      backgroundState = BackgroundState.Subseqrun

    break
    case BackgroundState.Subseqrun:

    break
  }

  let classList = element?.classList

  if (!classList || !curtain) {
    console.log("err")
    return
  }

  colorsCycleIndex++
  if (colorsCycleIndex >= colorsCycle.length) {
    colorsCycleIndex = 0
  }
  curtain.playCurtain()
  curtain.loadCurtain(colorsCycle[colorsCycleIndex])
}

onMounted(async () => {
  //@ts-expect-error
  await curtainRef.value?.loadCurtain(colorsCycle[0])
  reload()
})

async function pausePlay(): Promise<BackgroundState> {
  //@ts-expect-error
  return await curtainRef?.value?.pausePlay()
}

let firstRunStarted = false
let firstRunDone = false
let continualRun = false
const emit = defineEmits([
  'firstRunDone',
]);

defineExpose({ pausePlay })
</script>

<template>
  <div>
    <div
        class="curtain-holder"
        ref="curtainHolderRef">
      <Curtain
        class="curtain"
        ref="curtainRef"
        :playState="1"
        @curtainCall="reload"
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
.curtain-holder{
  position: fixed;
  z-index: -20;
}
.prev-curtain {
  z-index: -10;
}
.curr-curtain {
  z-index: 0;
}
</style>
