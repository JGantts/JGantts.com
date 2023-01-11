<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
// @ts-ignore
import{ Smooth } from '../assets/Smooth'
import {
  tomato,
  tomatoDark,
  red,
  redDark,
  crimson,
  crimsonDark,
  blue,
  blueDark,
  lime,
  limeDark,
  green,
  greenDark,
  sky,
  skyDark,
  orange,
  orangeDark,
  cyan,
  cyanDark,
  teal,
  tealDark,
  violet,
  violetDark,
  amber,
  amberDark,
  grass,
  grassDark,
  slate,
  slateDark,
  olive,
  oliveDark,
  sand,
  sandDark,
  mauve,
  mauveDark,

} from '@radix-ui/colors';

type Theme = {
  base1: Color,
  base2: Color,
  base3: Color,
  base4: Color,
  base5: Color,
  base6: Color,
  base7: Color,
  base8: Color,
  base9: Color,
  base10: Color,
  base11: Color,
  base12: Color,

  accent1: Color,
  accent2: Color,
  accent3: Color,
  accent4: Color,
  accent5: Color,
  accent6: Color,
  accent7: Color,
  accent8: Color,
  accent9: Color,
  accent10: Color,
  accent11: Color,
  accent12: Color,

  gray1: Color,
  gray2: Color,
  gray3: Color,
  gray4: Color,
  gray5: Color,
  gray6: Color,
  gray7: Color,
  gray8: Color,
  gray9: Color,
  gray10: Color,
  gray11: Color,
  gray12: Color,

  //variationHue: number,
  //variationSaturation: number,
  //variationLightness: number,
}

let theme_Red_Cyan_mauve: Theme = {
  base1: hslToComponents(red.red1),
  base2: hslToComponents(red.red2),
  base3: hslToComponents(red.red3),
  base4: hslToComponents(red.red4),
  base5: hslToComponents(red.red5),
  base6: hslToComponents(red.red6),
  base7: hslToComponents(red.red7),
  base8: hslToComponents(red.red8),
  base9: hslToComponents(red.red9),
  base10: hslToComponents(red.red10),
  base11: hslToComponents(red.red11),
  base12: hslToComponents(red.red12),

  accent1: hslToComponents(cyan.cyan1),
  accent2: hslToComponents(cyan.cyan2),
  accent3: hslToComponents(cyan.cyan3),
  accent4: hslToComponents(cyan.cyan4),
  accent5: hslToComponents(cyan.cyan5),
  accent6: hslToComponents(cyan.cyan6),
  accent7: hslToComponents(cyan.cyan7),
  accent8: hslToComponents(cyan.cyan8),
  accent9: hslToComponents(cyan.cyan9),
  accent10: hslToComponents(cyan.cyan10),
  accent11: hslToComponents(cyan.cyan11),
  accent12: hslToComponents(cyan.cyan12),

  gray1: hslToComponents(mauve.mauve1),
  gray2: hslToComponents(mauve.mauve2),
  gray3: hslToComponents(mauve.mauve3),
  gray4: hslToComponents(mauve.mauve4),
  gray5: hslToComponents(mauve.mauve5),
  gray6: hslToComponents(mauve.mauve6),
  gray7: hslToComponents(mauve.mauve7),
  gray8: hslToComponents(mauve.mauve8),
  gray9: hslToComponents(mauve.mauve9),
  gray10: hslToComponents(mauve.mauve10),
  gray11: hslToComponents(mauve.mauve11),
  gray12: hslToComponents(mauve.mauve12),
}

let theme_CrimsonDark_Green_mauve: Theme = {
  base1: hslToComponents(crimsonDark.crimson1),
  base2: hslToComponents(crimsonDark.crimson2),
  base3: hslToComponents(crimsonDark.crimson3),
  base4: hslToComponents(crimsonDark.crimson4),
  base5: hslToComponents(crimsonDark.crimson5),
  base6: hslToComponents(crimsonDark.crimson6),
  base7: hslToComponents(crimsonDark.crimson7),
  base8: hslToComponents(crimsonDark.crimson8),
  base9: hslToComponents(crimsonDark.crimson9),
  base10: hslToComponents(crimsonDark.crimson10),
  base11: hslToComponents(crimsonDark.crimson11),
  base12: hslToComponents(crimsonDark.crimson12),

  accent1: hslToComponents(green.green1),
  accent2: hslToComponents(green.green2),
  accent3: hslToComponents(green.green3),
  accent4: hslToComponents(green.green4),
  accent5: hslToComponents(green.green5),
  accent6: hslToComponents(green.green6),
  accent7: hslToComponents(green.green7),
  accent8: hslToComponents(green.green8),
  accent9: hslToComponents(green.green9),
  accent10: hslToComponents(green.green10),
  accent11: hslToComponents(green.green11),
  accent12: hslToComponents(green.green12),

  gray1: hslToComponents(mauveDark.mauve1),
  gray2: hslToComponents(mauveDark.mauve2),
  gray3: hslToComponents(mauveDark.mauve3),
  gray4: hslToComponents(mauveDark.mauve4),
  gray5: hslToComponents(mauveDark.mauve5),
  gray6: hslToComponents(mauveDark.mauve6),
  gray7: hslToComponents(mauveDark.mauve7),
  gray8: hslToComponents(mauveDark.mauve8),
  gray9: hslToComponents(mauveDark.mauve9),
  gray10: hslToComponents(mauveDark.mauve10),
  gray11: hslToComponents(mauveDark.mauve11),
  gray12: hslToComponents(mauveDark.mauve12),
}

let theme_Cyan_Red_slate: Theme = {
  base1: hslToComponents(cyan.cyan1),
  base2: hslToComponents(cyan.cyan2),
  base3: hslToComponents(cyan.cyan3),
  base4: hslToComponents(cyan.cyan4),
  base5: hslToComponents(cyan.cyan5),
  base6: hslToComponents(cyan.cyan6),
  base7: hslToComponents(cyan.cyan7),
  base8: hslToComponents(cyan.cyan8),
  base9: hslToComponents(cyan.cyan9),
  base10: hslToComponents(cyan.cyan10),
  base11: hslToComponents(cyan.cyan11),
  base12: hslToComponents(cyan.cyan12),

  accent1: hslToComponents(red.red1),
  accent2: hslToComponents(red.red2),
  accent3: hslToComponents(red.red3),
  accent4: hslToComponents(red.red4),
  accent5: hslToComponents(red.red5),
  accent6: hslToComponents(red.red6),
  accent7: hslToComponents(red.red7),
  accent8: hslToComponents(red.red8),
  accent9: hslToComponents(red.red9),
  accent10: hslToComponents(red.red10),
  accent11: hslToComponents(red.red11),
  accent12: hslToComponents(red.red12),

  gray1: hslToComponents(slate.slate1),
  gray2: hslToComponents(slate.slate2),
  gray3: hslToComponents(slate.slate3),
  gray4: hslToComponents(slate.slate4),
  gray5: hslToComponents(slate.slate5),
  gray6: hslToComponents(slate.slate6),
  gray7: hslToComponents(slate.slate7),
  gray8: hslToComponents(slate.slate8),
  gray9: hslToComponents(slate.slate9),
  gray10: hslToComponents(slate.slate10),
  gray11: hslToComponents(slate.slate11),
  gray12: hslToComponents(slate.slate12),
}

let theme_GrassDark_Tomato_olive: Theme = {
  base1: hslToComponents(grassDark.grass1),
  base2: hslToComponents(grassDark.grass2),
  base3: hslToComponents(grassDark.grass3),
  base4: hslToComponents(grassDark.grass4),
  base5: hslToComponents(grassDark.grass5),
  base6: hslToComponents(grassDark.grass6),
  base7: hslToComponents(grassDark.grass7),
  base8: hslToComponents(grassDark.grass8),
  base9: hslToComponents(grassDark.grass9),
  base10: hslToComponents(grassDark.grass10),
  base11: hslToComponents(grassDark.grass11),
  base12: hslToComponents(grassDark.grass12),

  accent1: hslToComponents(tomato.tomato1),
  accent2: hslToComponents(tomato.tomato2),
  accent3: hslToComponents(tomato.tomato3),
  accent4: hslToComponents(tomato.tomato4),
  accent5: hslToComponents(tomato.tomato5),
  accent6: hslToComponents(tomato.tomato6),
  accent7: hslToComponents(tomato.tomato7),
  accent8: hslToComponents(tomato.tomato8),
  accent9: hslToComponents(tomato.tomato9),
  accent10: hslToComponents(tomato.tomato10),
  accent11: hslToComponents(tomato.tomato11),
  accent12: hslToComponents(tomato.tomato12),

  gray1: hslToComponents(oliveDark.olive1),
  gray2: hslToComponents(oliveDark.olive2),
  gray3: hslToComponents(oliveDark.olive3),
  gray4: hslToComponents(oliveDark.olive4),
  gray5: hslToComponents(oliveDark.olive5),
  gray6: hslToComponents(oliveDark.olive6),
  gray7: hslToComponents(oliveDark.olive7),
  gray8: hslToComponents(oliveDark.olive8),
  gray9: hslToComponents(oliveDark.olive9),
  gray10: hslToComponents(oliveDark.olive10),
  gray11: hslToComponents(oliveDark.olive11),
  gray12: hslToComponents(oliveDark.olive12),
}

let theme_Sky_Orange_slate: Theme = {
  base1: hslToComponents(sky.sky1),
  base2: hslToComponents(sky.sky2),
  base3: hslToComponents(sky.sky3),
  base4: hslToComponents(sky.sky4),
  base5: hslToComponents(sky.sky5),
  base6: hslToComponents(sky.sky6),
  base7: hslToComponents(sky.sky7),
  base8: hslToComponents(sky.sky8),
  base9: hslToComponents(sky.sky9),
  base10: hslToComponents(sky.sky10),
  base11: hslToComponents(sky.sky11),
  base12: hslToComponents(sky.sky12),

  accent1: hslToComponents(orange.orange1),
  accent2: hslToComponents(orange.orange2),
  accent3: hslToComponents(orange.orange3),
  accent4: hslToComponents(orange.orange4),
  accent5: hslToComponents(orange.orange5),
  accent6: hslToComponents(orange.orange6),
  accent7: hslToComponents(orange.orange7),
  accent8: hslToComponents(orange.orange8),
  accent9: hslToComponents(orange.orange9),
  accent10: hslToComponents(orange.orange10),
  accent11: hslToComponents(orange.orange11),
  accent12: hslToComponents(orange.orange12),

  gray1: hslToComponents(slate.slate1),
  gray2: hslToComponents(slate.slate2),
  gray3: hslToComponents(slate.slate3),
  gray4: hslToComponents(slate.slate4),
  gray5: hslToComponents(slate.slate5),
  gray6: hslToComponents(slate.slate6),
  gray7: hslToComponents(slate.slate7),
  gray8: hslToComponents(slate.slate8),
  gray9: hslToComponents(slate.slate9),
  gray10: hslToComponents(slate.slate10),
  gray11: hslToComponents(slate.slate11),
  gray12: hslToComponents(slate.slate12),
}

let theme_SkyDark_Orange_slate: Theme = {
  base1: hslToComponents(skyDark.sky1),
  base2: hslToComponents(skyDark.sky2),
  base3: hslToComponents(skyDark.sky3),
  base4: hslToComponents(skyDark.sky4),
  base5: hslToComponents(skyDark.sky5),
  base6: hslToComponents(skyDark.sky6),
  base7: hslToComponents(skyDark.sky7),
  base8: hslToComponents(skyDark.sky8),
  base9: hslToComponents(skyDark.sky9),
  base10: hslToComponents(skyDark.sky10),
  base11: hslToComponents(skyDark.sky11),
  base12: hslToComponents(skyDark.sky12),

  accent1: hslToComponents(orange.orange1),
  accent2: hslToComponents(orange.orange2),
  accent3: hslToComponents(orange.orange3),
  accent4: hslToComponents(orange.orange4),
  accent5: hslToComponents(orange.orange5),
  accent6: hslToComponents(orange.orange6),
  accent7: hslToComponents(orange.orange7),
  accent8: hslToComponents(orange.orange8),
  accent9: hslToComponents(orange.orange9),
  accent10: hslToComponents(orange.orange10),
  accent11: hslToComponents(orange.orange11),
  accent12: hslToComponents(orange.orange12),

  gray1: hslToComponents(slateDark.slate1),
  gray2: hslToComponents(slateDark.slate2),
  gray3: hslToComponents(slateDark.slate3),
  gray4: hslToComponents(slateDark.slate4),
  gray5: hslToComponents(slateDark.slate5),
  gray6: hslToComponents(slateDark.slate6),
  gray7: hslToComponents(slateDark.slate7),
  gray8: hslToComponents(slateDark.slate8),
  gray9: hslToComponents(slateDark.slate9),
  gray10: hslToComponents(slateDark.slate10),
  gray11: hslToComponents(slateDark.slate11),
  gray12: hslToComponents(slateDark.slate12),
}

let theme_Lime_Blue_olive: Theme = {
  base1: hslToComponents(lime.lime1),
  base2: hslToComponents(lime.lime2),
  base3: hslToComponents(lime.lime3),
  base4: hslToComponents(lime.lime4),
  base5: hslToComponents(lime.lime5),
  base6: hslToComponents(lime.lime6),
  base7: hslToComponents(lime.lime7),
  base8: hslToComponents(lime.lime8),
  base9: hslToComponents(lime.lime9),
  base10: hslToComponents(lime.lime10),
  base11: hslToComponents(lime.lime11),
  base12: hslToComponents(lime.lime12),

  accent1: hslToComponents(blue.blue1),
  accent2: hslToComponents(blue.blue2),
  accent3: hslToComponents(blue.blue3),
  accent4: hslToComponents(blue.blue4),
  accent5: hslToComponents(blue.blue5),
  accent6: hslToComponents(blue.blue6),
  accent7: hslToComponents(blue.blue7),
  accent8: hslToComponents(blue.blue8),
  accent9: hslToComponents(blue.blue9),
  accent10: hslToComponents(blue.blue10),
  accent11: hslToComponents(blue.blue11),
  accent12: hslToComponents(blue.blue12),

  gray1: hslToComponents(olive.olive1),
  gray2: hslToComponents(olive.olive2),
  gray3: hslToComponents(olive.olive3),
  gray4: hslToComponents(olive.olive4),
  gray5: hslToComponents(olive.olive5),
  gray6: hslToComponents(olive.olive6),
  gray7: hslToComponents(olive.olive7),
  gray8: hslToComponents(olive.olive8),
  gray9: hslToComponents(olive.olive9),
  gray10: hslToComponents(olive.olive10),
  gray11: hslToComponents(olive.olive11),
  gray12: hslToComponents(olive.olive12),
}

let theme_AmberDark_Violet_sand: Theme = {
  base1: hslToComponents(amberDark.amber1),
  base2: hslToComponents(amberDark.amber2),
  base3: hslToComponents(amberDark.amber3),
  base4: hslToComponents(amberDark.amber4),
  base5: hslToComponents(amberDark.amber5),
  base6: hslToComponents(amberDark.amber6),
  base7: hslToComponents(amberDark.amber7),
  base8: hslToComponents(amberDark.amber8),
  base9: hslToComponents(amberDark.amber9),
  base10: hslToComponents(amberDark.amber10),
  base11: hslToComponents(amberDark.amber11),
  base12: hslToComponents(amberDark.amber12),

  accent1: hslToComponents(violet.violet1),
  accent2: hslToComponents(violet.violet2),
  accent3: hslToComponents(violet.violet3),
  accent4: hslToComponents(violet.violet4),
  accent5: hslToComponents(violet.violet5),
  accent6: hslToComponents(violet.violet6),
  accent7: hslToComponents(violet.violet7),
  accent8: hslToComponents(violet.violet8),
  accent9: hslToComponents(violet.violet9),
  accent10: hslToComponents(violet.violet10),
  accent11: hslToComponents(violet.violet11),
  accent12: hslToComponents(violet.violet12),

  gray1: hslToComponents(sandDark.sand1),
  gray2: hslToComponents(sandDark.sand2),
  gray3: hslToComponents(sandDark.sand3),
  gray4: hslToComponents(sandDark.sand4),
  gray5: hslToComponents(sandDark.sand5),
  gray6: hslToComponents(sandDark.sand6),
  gray7: hslToComponents(sandDark.sand7),
  gray8: hslToComponents(sandDark.sand8),
  gray9: hslToComponents(sandDark.sand9),
  gray10: hslToComponents(sandDark.sand10),
  gray11: hslToComponents(sandDark.sand11),
  gray12: hslToComponents(sandDark.sand12),
}

//let theme = theme_SkyDark_Orange_slate

let theme = theme_Sky_Orange_slate

let PIXELATED_FINE_BOX_SIZE = 1
let PIXELATED_LARGE_BOX_SIZE = 8
let PIXELATED_SUPER_BOX_SIZE = 32
let PIXELATION_RATIO_SUPER_LARGE = Math.floor(PIXELATED_SUPER_BOX_SIZE/PIXELATED_LARGE_BOX_SIZE)
let PIXELATION_RATIO_LARGE_FINE = Math.floor(PIXELATED_LARGE_BOX_SIZE/PIXELATED_FINE_BOX_SIZE)
let PIXELATION_RATIO_LARGE_SUPER = Math.ceil(PIXELATED_LARGE_BOX_SIZE/PIXELATED_LARGE_BOX_SIZE)

let SMOOTHED_BOX_SIZE = 16

let TOP_BUFFER_PIXEL = 34

let widthInSuperPixels = 0
let heightInSuperPixels = 0

let widthInLargePixels = 0
let heightInLargePixels = 0

let widthInFinePixels = 0
let heightInFinePixels = 0

type Position = {
  x: number,
  y: number 
}

type Color = { 
  hue: number, 
  saturation: number, 
  lightness: number
}

type GaussianObject = {
  position: number,
  velocity: number,
  acceleration: number,
  jolt: number,
}

/*
  Initialize variables
*/
let pixelColumnsSuper: Color[][] = []
let pixelColumnsLarge: Color[][] = []
let pixelColumnsFine: Color[][] = []

let gaussianObjects: GaussianObject[]

let canvasPixelElement: HTMLCanvasElement
let canvasPixelContext: CanvasRenderingContext2D
let canvasSmoothElement: HTMLCanvasElement
let canvasSmoothContext: CanvasRenderingContext2D

/*
  Rendering functions
*/
async function initializeScene() {
  canvasPixelElement.width = canvasPixelElement.clientWidth;
  canvasPixelElement.height = canvasPixelElement.clientHeight;
  canvasSmoothElement.width = canvasSmoothElement.clientWidth;
  canvasSmoothElement.height = canvasSmoothElement.clientHeight;

  widthInLargePixels = Math.ceil(canvasPixelElement.width/PIXELATED_LARGE_BOX_SIZE) + 1
  heightInLargePixels = Math.ceil(canvasPixelElement.height/PIXELATED_LARGE_BOX_SIZE) + 1
  widthInSuperPixels = widthInLargePixels*PIXELATION_RATIO_LARGE_SUPER
  heightInSuperPixels = heightInLargePixels*PIXELATION_RATIO_LARGE_SUPER
  widthInFinePixels = widthInLargePixels*PIXELATION_RATIO_LARGE_FINE
  heightInFinePixels = heightInLargePixels*PIXELATION_RATIO_LARGE_FINE

  let countToAddSmoothed = widthInLargePixels*PIXELATED_LARGE_BOX_SIZE/SMOOTHED_BOX_SIZE

  let gaussianSumsPixelsSuper: number[] = gaussians(
    widthInSuperPixels,
    () => {return Math.random()*90 + 10},
    0, 1
  )
  let gaussianSumsPixelsLarge: number[] = gaussians(
    widthInLargePixels,
    () => {return Math.random()*90 + 10},
    0, 1
  )
  let gaussianSumsPixelsFine: number[] = gaussians(
    widthInFinePixels,
    () => {return Math.random()*90 + 10},
    0, 1
  )

  let gaussianSumsPosition: number[] = gaussians(
    countToAddSmoothed,
    () => {return Math.random()*90 + 10},
    -300, 0
  )
  let gaussianSumsVelocity: number[] = gaussians(
    countToAddSmoothed,
    () => {return Math.random()*90 + 10},
    0, 0.5
  )
  let gaussianSumsAcceleration: number[] = gaussians(
    countToAddSmoothed,
    () => {return Math.random()*90 + 10},
    0.005, 0.01
  )
  let gaussianSumsJolt: number[] = gaussians(
    countToAddSmoothed,
    () => {return Math.random()*90 + 10},
    -0.000005, 0.000005
  )

  /*
    Take the begining offsets and initialize the columns
  */
  for (let i=0; i < widthInSuperPixels; i++) {
    pixelColumnsSuper.push(
      new Array(Math.floor(gaussianSumsPixelsSuper[i]*30)).fill(randomBlue()),
    )
  }
  await paintPixelsSuper()
  for (let i=0; i < widthInLargePixels; i++) {
    pixelColumnsLarge.push(
      new Array(Math.floor(gaussianSumsPixelsLarge[i]*30)).fill(randomBlue()),
    )
  }
  await paintPixelsLarge()
  for (let i=0; i < widthInFinePixels; i++) {
    pixelColumnsFine.push(
      new Array(Math.floor(gaussianSumsPixelsFine[i]*30)).fill(randomBlue()),
    )
  }
  await paintPixelsFine()

  gaussianObjects = []
  for (let index=0; index < countToAddSmoothed; index++) {
    gaussianObjects.push({
        position: gaussianSumsPosition[index] - 500*(Math.abs(index-0.15*countToAddSmoothed))/countToAddSmoothed,
        velocity: gaussianSumsVelocity[index],
        acceleration: gaussianSumsAcceleration[index],
        jolt: gaussianSumsJolt[index],
      })
  }
}

async function renderLoop() {
  let done = await renderScene()
  if (!done) {
    window.requestAnimationFrame(renderLoop)
  }
}


async function paintPixelsSuper() {
  while ((pixelColumnsSuper[0].length-TOP_BUFFER_PIXEL*2) < heightInSuperPixels) {
    for (let key in pixelColumnsSuper) {
      calculateColumnSuper(Number(key))
    }
  }
}

async function paintPixelsLarge() {
  while ((pixelColumnsLarge[0].length-TOP_BUFFER_PIXEL*2) < heightInLargePixels) {
    for (let key in pixelColumnsLarge) {
      calculateColumnLarge(Number(key))
    }
  }
}

async function paintPixelsFine() {
  while ((pixelColumnsFine[0].length-TOP_BUFFER_PIXEL*2) < heightInFinePixels) {
    for (let key in pixelColumnsFine) {
      calculateColumnFine(Number(key))
    }
  }
  for (let key in pixelColumnsFine) {
    renderColumn(Number(key))
  }
}

async function calculateColumnSuper(index: number) { 
  let column = pixelColumnsSuper[index]

  /*
    Add new box
  */

  /* random color */
  let color = randomBlue()

  /* smooth out color with existing neighbors */
  let parent = null
  let leftCousin = null
  let rightCousin = null

  parent = column[column.length-1]
  let leftLineage = pixelColumnsSuper[index - 1]
  if (leftLineage) {
    leftCousin = leftLineage[column.length - 1]
  }
  let rightLineage = pixelColumnsSuper[index + 1]
  if (rightLineage) {
    rightCousin = rightLineage[column.length - 1]
  }
  let colorToTint = {
    r: 0,
    g: 0,
    b: 0,
    a: 0
  }
  let colorsAdded = 0
  if (parent) {
    colorToTint.r += parent.hue
    colorToTint.g += parent.saturation
    colorToTint.b += parent.lightness
    colorsAdded += 1
  }
  if (leftCousin) {
    colorToTint.r += leftCousin.hue
    colorToTint.g += leftCousin.saturation
    colorToTint.b += leftCousin.lightness
    colorsAdded += 1
  }
  if (rightCousin) {
    colorToTint.r += rightCousin.hue
    colorToTint.g += rightCousin.saturation
    colorToTint.b += rightCousin.lightness
    colorsAdded += 1
  }
  if(colorsAdded != 0) {
    colorToTint.r /= colorsAdded
    colorToTint.g /= colorsAdded
    colorToTint.b /= colorsAdded

    let randomMultiplier = 1
    let consistentMultiplier = 10
    let multiplierSum = randomMultiplier + consistentMultiplier

    let red =
      randomMultiplier * color.hue
      + consistentMultiplier * colorToTint.r
    let green =
      randomMultiplier * color.saturation
      + consistentMultiplier * colorToTint.g
    let blue =
      randomMultiplier * color.lightness
      + consistentMultiplier * colorToTint.b

    red = Math.floor(red/multiplierSum)
    green = Math.floor(green/multiplierSum)
    blue = Math.floor(blue/multiplierSum)

    color.hue = red
    color.saturation = green
    color.lightness = blue
  }

  column.push(
    color
  )
}

async function calculateColumnLarge(index: number) {
  let column = pixelColumnsLarge[index]

  /*
    Add new box
  */

  /* random color */
  let transdimensionalAncestorColumn = pixelColumnsSuper[Math.floor(index/PIXELATION_RATIO_SUPER_LARGE)]

  let transdimensionalAncestorColor: Color = transdimensionalAncestorColumn[Math.floor(column.length/PIXELATION_RATIO_SUPER_LARGE)+TOP_BUFFER_PIXEL]
  let color = randomBlueDeep()

  /* smooth out color with existing neighbors */
  let parent = null
  let leftCousin = null
  let rightCousin = null

  parent = column[column.length-1]
  let leftLineage = pixelColumnsLarge[index - 1]
  if (leftLineage) {
    leftCousin = leftLineage[column.length - 1]
  }
  let rightLineage = pixelColumnsLarge[index + 1]
  if (rightLineage) {
    rightCousin = rightLineage[column.length - 1]
  }
  let colorToTint = {
    r: 0,
    g: 0,
    b: 0,
    a: 0
  }
  let colorsAdded = 0
  if (parent) {
    colorToTint.r += parent.hue
    colorToTint.g += parent.saturation
    colorToTint.b += parent.lightness
    colorsAdded += 1
  }
  if (leftCousin) {
    colorToTint.r += leftCousin.hue
    colorToTint.g += leftCousin.saturation
    colorToTint.b += leftCousin.lightness
    colorsAdded += 1
  }
  if (rightCousin) {
    colorToTint.r += rightCousin.hue
    colorToTint.g += rightCousin.saturation
    colorToTint.b += rightCousin.lightness
    colorsAdded += 1
  }
  if(colorsAdded != 0) {
    colorToTint.r /= colorsAdded
    colorToTint.g /= colorsAdded
    colorToTint.b /= colorsAdded

    let transdimensionalMultiplier = 2
    let randomMultiplier = 1
    let consistentMultiplier = 5
    let multiplierSum = transdimensionalMultiplier + randomMultiplier + consistentMultiplier

    let red =
      transdimensionalMultiplier * transdimensionalAncestorColor.hue
      + randomMultiplier * color.hue
      + consistentMultiplier * colorToTint.r
    let green =
      transdimensionalMultiplier * transdimensionalAncestorColor.saturation
      + randomMultiplier * color.saturation
      + consistentMultiplier * colorToTint.g
    let blue =
      transdimensionalMultiplier * transdimensionalAncestorColor.lightness
      + randomMultiplier * color.lightness
      + consistentMultiplier * colorToTint.b

    red = Math.floor(red/multiplierSum)
    green = Math.floor(green/multiplierSum)
    blue = Math.floor(blue/multiplierSum)

    color.hue = red
    color.saturation = green
    color.lightness = blue
  }

  column.push(
    color
  )
}

async function calculateColumnFine(index: number) {
  let column = pixelColumnsFine[index]

  /*
    Add new box
  */

  /* random color */
  let transdimensionalAncestorColumn = pixelColumnsLarge[Math.floor(index/PIXELATION_RATIO_LARGE_FINE)]

  let transdimensionalAncestorColor: Color = transdimensionalAncestorColumn[Math.floor(column.length/PIXELATION_RATIO_LARGE_FINE)+TOP_BUFFER_PIXEL]
  let color = randomBlue()

  if (!transdimensionalAncestorColor) {
    transdimensionalAncestorColor = {
      hue: 12,
      saturation: 50,
      lightness: 80,
    }
  }

  /* smooth out color with existing neighbors */
  let parent = null
  let leftCousin = null
  let rightCousin = null

  parent = column[column.length-1]
  let leftLineage = pixelColumnsFine[index - 1]
  if (leftLineage) {
    leftCousin = leftLineage[column.length - 1]
  }
  let rightLineage = pixelColumnsFine[index + 1]
  if (rightLineage) {
    rightCousin = rightLineage[column.length - 1]
  }
  let colorToTint = {
    r: 0,
    g: 0,
    b: 0,
    a: 0
  }
  let colorsAdded = 0
  if (parent) {
    colorToTint.r += parent.hue
    colorToTint.g += parent.saturation
    colorToTint.b += parent.lightness
    colorsAdded += 1
  }
  if (leftCousin) {
    colorToTint.r += leftCousin.hue
    colorToTint.g += leftCousin.saturation
    colorToTint.b += leftCousin.lightness
    colorsAdded += 1
  }
  if (rightCousin) {
    colorToTint.r += rightCousin.hue
    colorToTint.g += rightCousin.saturation
    colorToTint.b += rightCousin.lightness
    colorsAdded += 1
  }
  if(colorsAdded != 0) {
    colorToTint.r /= colorsAdded
    colorToTint.g /= colorsAdded
    colorToTint.b /= colorsAdded

    let transdimensionalMultiplier = 3
    let randomMultiplier = 1
    let consistentMultiplier = 10
    let multiplierSum = transdimensionalMultiplier + randomMultiplier + consistentMultiplier

    let red =
      transdimensionalMultiplier * transdimensionalAncestorColor.hue
      + randomMultiplier * color.hue
      + consistentMultiplier * colorToTint.r
    let green =
      transdimensionalMultiplier * transdimensionalAncestorColor.saturation
      + randomMultiplier * color.saturation
      + consistentMultiplier * colorToTint.g
    let blue =
      transdimensionalMultiplier * transdimensionalAncestorColor.lightness
      + randomMultiplier * color.lightness
      + consistentMultiplier * colorToTint.b

    red = Math.floor(red/multiplierSum)
    green = Math.floor(green/multiplierSum)
    blue = Math.floor(blue/multiplierSum)

    color.hue = red
    color.saturation = green
    color.lightness = blue
  }

  column.push(
    color
  )
}


let doneAnimatingCurtain = false
async function renderScene(): Promise<Boolean> {
  if (doneAnimatingCurtain) {
    return true
  }

  let eachIsDone = true
  for (let index=0; index < gaussianObjects.length; index++) {
    gaussianObjects[index].acceleration += gaussianObjects[index].jolt
    gaussianObjects[index].velocity += gaussianObjects[index].acceleration
    //friction
    gaussianObjects[index].velocity *= 0.999
    gaussianObjects[index].position += gaussianObjects[index].velocity
    if (gaussianObjects[index].position < canvasPixelElement.height + 2 ) {
      eachIsDone = false
    }
  }
  if (eachIsDone) {
    doneAnimatingCurtain = true
    return true
  }

  //@ts-ignore
  let gaussionSmoothed = Smooth(gaussianObjects.map(objct => objct.position))

  canvasSmoothContext.clearRect(0, 0, canvasSmoothElement.width, canvasSmoothElement.height);

  canvasSmoothContext.beginPath()
  let index=0
  canvasSmoothContext.moveTo(index, gaussionSmoothed(index))
  index++
  for (; index < gaussianObjects.length*SMOOTHED_BOX_SIZE; index++) {
    canvasSmoothContext.lineTo(index, gaussionSmoothed(index/SMOOTHED_BOX_SIZE))
  }
  canvasSmoothContext.lineTo(canvasSmoothElement.clientWidth, canvasSmoothElement.clientHeight)
  canvasSmoothContext.lineTo(0, canvasSmoothElement.clientHeight)
  canvasSmoothContext.closePath()

  canvasSmoothContext.fillStyle = componentsTohsl(theme.base3)
  canvasSmoothContext.fill()
  canvasSmoothContext.restore()
  return false
}

async function renderColumn(columnIndex: number) {
  let column = pixelColumnsFine[columnIndex]
  for (let boxIndex=TOP_BUFFER_PIXEL; boxIndex<column.length; boxIndex++) {
    tryRenderBox(columnIndex, boxIndex)
  }
}

function tryRenderBox(columnIndex: number, boxIndex: number): boolean {
    let column = pixelColumnsFine[columnIndex]
    let me = column[boxIndex]
    if (me == null) {
      return false
    }
    renderPixel({
      position: { x: columnIndex-1, y: boxIndex-1-TOP_BUFFER_PIXEL},
      color: me,
    })
    return true
}

function renderPixel(
  pixelData: {
    position: Position,
    color: Color
}) {
  let left = (pixelData.position.x)*PIXELATED_FINE_BOX_SIZE
  let top = (pixelData.position.y)*PIXELATED_FINE_BOX_SIZE
  let right = left + PIXELATED_FINE_BOX_SIZE
  let bottom = top + PIXELATED_FINE_BOX_SIZE

  canvasPixelContext.clearRect(left, top, PIXELATED_FINE_BOX_SIZE, PIXELATED_FINE_BOX_SIZE)

  canvasPixelContext.fillStyle = componentsTohsl(pixelData.color)
  canvasPixelContext.fillRect(left, top, PIXELATED_FINE_BOX_SIZE, PIXELATED_FINE_BOX_SIZE)
}

/*
  Helper functions
*/
function randomColor(): Color {
  let basePrimary = theme.base9
  let color = {
    hue: Math.random()*360,
    saturation: basePrimary.saturation + Math.random()*80 - 40,
    lightness: basePrimary.lightness + Math.random()*100 - 50,
  }
  return color
}
function randomBlue(): Color {
  let basePrimary = theme.base9
  let color = {
    hue: basePrimary.hue,// + Math.random()*80 - 40,
    saturation: basePrimary.saturation + Math.random()*80 - 40,
    lightness: basePrimary.lightness + Math.random()*100 - 50,
  }
  return color
}
function randomBlueDeep(): Color {
  let basePrimary = theme.base9
  let color = {
    hue: basePrimary.hue,// + Math.random()*80 - 40,
    saturation: basePrimary.saturation + Math.random()*80 - 40,
    lightness: basePrimary.lightness + Math.random()*100 - 50,
  }
  return color
}

function hslToComponents(hsl: string): Color {
  let splitA = hsl.split(',')
  let hue = splitA[0].split('(')[1]
  let saturation = splitA[1].split('%')[0]
  let lightness = splitA[2].split('%')[0]
  let color = {
    hue: Number(hue),
    saturation: Number(saturation),
    lightness: Number(lightness),
  }
  return color
}

function componentsTohsl(color: Color): string {
  return `hsl(${color.hue}, ${color.saturation}%, ${color.lightness}%)`
}

function boxToHex(color: Color, alphaMultiplier: number) {
  return `hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, ${alphaMultiplier})`
}
function decToTwoDigitHex(dec: number) {
  let hexRaw = Math.floor(dec).toString(16)
  return (hexRaw.length==1) ? "0"+hexRaw : hexRaw
}

const gaussianDistance = 20
const MAGIC_NUMBER_A = 5.5

function gaussians(count: number, variance: () => number, sumMin: number, sumMax: number) {
  let sumRange = sumMax - sumMin
  let sumMid = (sumMax + sumMin)/2

  let gaussianDistsPos: number[][] = []
  for (let i=0; i < count + gaussianDistance*2; i++) {
    gaussianDistsPos.push(gaussianDistribution(variance()))
  }
  let gaussianSumsPos: number[] = 
    gaussianSums(gaussianDistsPos, count, gaussianDistance, sum => {
      let localizedToZero = sum/e-1
      let scaledToOne = localizedToZero*MAGIC_NUMBER_A
      let scaledToRange = (scaledToOne*sumRange/2) + sumMid
      let clamppedToRange = 
        scaledToRange > sumMax 
          ? sumMax
          : scaledToRange < sumMin
            ? sumMin
            : scaledToRange
      return clamppedToRange
    })
  return gaussianSumsPos
}

function gaussianSums(
  dists: number[][], 
  length: number,
  distance: number,
  noramalizer: (x: number) => number
): number[] {
  let gaussianSums: number[] = []
  for (let i=distance; i < length+distance; i++) {
    let sum = 0
    for (let j=0; j < distance*2; j++) {
      sum += dists[i-(j-distance)][j]
    }

    gaussianSums.push(noramalizer(sum))
  }
  return gaussianSums
}

function gaussianDistribution(variance: number): number[] {
  let lowres: number[] = []
  let oneOverSqrtTwoPiVariance: number = 1/Math.sqrt(2*Math.PI*variance)
  for (let i = -gaussianDistance; i <= gaussianDistance; i++) {
    lowres.push(gaussianDistributionAt(variance, oneOverSqrtTwoPiVariance, i))
  }
  return lowres
}

let e = 2.7182812690734863
function gaussianDistributionAt(variance: number, oneOverSqrtTwoPiVariance: number, x: number): number {
    let negativeXSquaredOver2Variance: number = 1-(x*x)/(2*variance)
    let output: number = oneOverSqrtTwoPiVariance*Math.pow(e, negativeXSquaredOver2Variance)
    return output
}

/*
  Actual setup code
*/
const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)")

/*
  And begin!
*/



onMounted(async () => {
  console.log("Hello, world!")
  let bs = document.body.style
  bs.setProperty("--base1", componentsTohsl(theme.base1))
  bs.setProperty("--base2", componentsTohsl(theme.base2))
  bs.setProperty("--base3", componentsTohsl(theme.base3))
  bs.setProperty("--base4", componentsTohsl(theme.base4))
  bs.setProperty("--base5", componentsTohsl(theme.base5))
  bs.setProperty("--base6", componentsTohsl(theme.base6))
  bs.setProperty("--base7", componentsTohsl(theme.base7))
  bs.setProperty("--base8", componentsTohsl(theme.base8))
  bs.setProperty("--base9", componentsTohsl(theme.base9))
  bs.setProperty("--base10", componentsTohsl(theme.base10))
  bs.setProperty("--base11", componentsTohsl(theme.base11))
  bs.setProperty("--base12", componentsTohsl(theme.base12))

  bs.setProperty("--accent1", componentsTohsl(theme.accent1))
  bs.setProperty("--accent2", componentsTohsl(theme.accent2))
  bs.setProperty("--accent3", componentsTohsl(theme.accent3))
  bs.setProperty("--accent4", componentsTohsl(theme.accent4))
  bs.setProperty("--accent5", componentsTohsl(theme.accent5))
  bs.setProperty("--accent6", componentsTohsl(theme.accent6))
  bs.setProperty("--accent7", componentsTohsl(theme.accent7))
  bs.setProperty("--accent8", componentsTohsl(theme.accent8))
  bs.setProperty("--accent9", componentsTohsl(theme.accent9))
  bs.setProperty("--accent10", componentsTohsl(theme.accent10))
  bs.setProperty("--accent11", componentsTohsl(theme.accent11))
  bs.setProperty("--accent12", componentsTohsl(theme.accent12))

  bs.setProperty("--gray1", componentsTohsl(theme.gray1))
  bs.setProperty("--gray2", componentsTohsl(theme.gray2))
  bs.setProperty("--gray3", componentsTohsl(theme.gray3))
  bs.setProperty("--gray4", componentsTohsl(theme.gray4))
  bs.setProperty("--gray5", componentsTohsl(theme.gray5))
  bs.setProperty("--gray6", componentsTohsl(theme.gray6))
  bs.setProperty("--gray7", componentsTohsl(theme.gray7))
  bs.setProperty("--gray8", componentsTohsl(theme.gray8))
  bs.setProperty("--gray9", componentsTohsl(theme.gray9))
  bs.setProperty("--gray10", componentsTohsl(theme.gray10))
  bs.setProperty("--gray11", componentsTohsl(theme.gray11))
  bs.setProperty("--gray12", componentsTohsl(theme.gray12))

  canvasPixelElement = document.getElementById('lowres-canvas') as HTMLCanvasElement
  canvasPixelContext = canvasPixelElement.getContext("2d")!
  canvasSmoothElement = document.getElementById('highres-canvas') as HTMLCanvasElement
  canvasSmoothContext = canvasSmoothElement.getContext("2d")!
  
  await initializeScene()
  //await new Promise(resolve => setTimeout(resolve, 400))
  window.requestAnimationFrame(renderLoop)
})

/*onUnmounted(() => {
  window.removeEventListener("resize", resizedWindow)
})

window.addEventListener("resize", resizedWindow)*/
</script>

<template>
  <div id='canvas-holder'>
    <canvas
    id='lowres-canvas'
    style= 'position: absolute; z-index: 2;'
    >NOOOOO!</canvas>
    <canvas
    id='highres-canvas'
    style= 'position: absolute; z-index: 3;'
    >NOOOOO!</canvas>
  </div>
</template>

<style scoped>
#canvas-holder {
  position: absolute;
  left: 0;
  top: -0;
  width: 100vw;
  height: 100vh;
  overflow: clip;
}
#lowres-canvas {
  position: absolute;
  left: 0;
  top: -0;
  width: 100vw;
  height: 100vh;
  overflow: clip;
}
#highres-canvas {
  position: absolute;
  left: 0;
  top: -0;
  width: 100vw;
  height: 100vh;
  overflow: clip;
}
</style>
