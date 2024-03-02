<script setup lang="ts">
import { ref, onMounted } from 'vue'

import Curtain from '@/Curtain/Curtain.vue';

import type { Color } from '../Curtain/Types';

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

} from '@radix-ui/colors';

let colorsCycleIndex = 0
const colorsCycle: Rainbow[] = [
  {
      dir: RainbowDirection.Regular,
      stops: [
        { stop: 0, color: hslToComponents(sky.sky10) },
        { stop: 0.45, color: hslToComponents(blue.blue10) },
        { stop: 0.5, color: hslToComponents(blue.blue10) },
        { stop: 0.6, color: hslToComponents(blue.blue10) },
        { stop: 1, color: hslToComponents(grass.grass10) },
      ],
    curve: {
      pos: { low: -300, high: 0 },
      velo: { low: 0, high: 5 },
      acc: { low: 5, high: 10 },
      jolt: { low: -5, high: 5 },
    },
  },
  {
    dir: RainbowDirection.Regular,
    stops: [
      { stop: 0, color: hslToComponents(orange.orange9) },
      { stop: 0.45, color: hslToComponents(tomato.tomato9) },
      //{ stop: 0.5, color: hslToComponents(tomato.tomato9) },
      { stop: 0.6, color: hslToComponents(tomato.tomato10) },
      { stop: 1, color: hslToComponents(ruby.ruby11) },
    ],
    curve: {
      pos: { low: -300, high: 0 },
      velo: { low: 0, high: 5 },
      acc: { low: 5, high: 10 },
      jolt: { low: -5, high: 5 },
    },
  },

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

const curtain1Ref = ref(null)
const curtain2Ref = ref(null)

const curtainHolder1Ref = ref(null)
const curtainHolder2Ref = ref(null)

const reload1 = async () => {
  loadNext(curtainHolder2Ref.value, curtainHolder1Ref.value, curtain2Ref.value)
}

const reload2 = async () => {
  loadNext(curtainHolder1Ref.value, curtainHolder2Ref.value, curtain1Ref.value)
}

function loadNext(
  element1: Element|null,
  element2: Element|null,
  curtainNext: Curtain|null
) {
  let classList1 = element1?.classList
  let classList2 = element2?.classList

  if (!classList1 || !classList2 || !curtainNext) {
    console.log("err")
    return
  }

  classList2.remove("front-curtain")
  classList1.add("front-curtain")
  if (colorsCycleIndex >= colorsCycle.length) {
    colorsCycleIndex = 0
  }
  curtainNext.reloadBackground(colorsCycle[colorsCycleIndex])
  colorsCycleIndex++
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
