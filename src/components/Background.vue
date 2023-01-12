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

  textGrayOnBaseLowContrast: Color,
  textGrayOnBase: Color,

  textGrayOnAccentLowContrast: Color,
  textGrayOnAccent: Color,

  textBaseOnBaseLowContrast: Color,
  textBaseOnBase: Color,

  textBaseOnAccentLowContrast: Color,
  textBaseOnAccent: Color,

  textAccentOnBaseLowContrast: Color,
  textAccentOnBase: Color,

  textAccentOnAccentLowContrast: Color,
  textAccentOnAccent: Color,

  base9Gradient: () => Color,
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

  accent1: hslToComponents(tomatoDark.tomato1),
  accent2: hslToComponents(tomatoDark.tomato2),
  accent3: hslToComponents(tomatoDark.tomato3),
  accent4: hslToComponents(tomatoDark.tomato4),
  accent5: hslToComponents(tomatoDark.tomato5),
  accent6: hslToComponents(tomatoDark.tomato6),
  accent7: hslToComponents(tomatoDark.tomato7),
  accent8: hslToComponents(tomatoDark.tomato8),
  accent9: hslToComponents(tomatoDark.tomato9),
  accent10: hslToComponents(tomatoDark.tomato10),
  accent11: hslToComponents(tomatoDark.tomato11),
  accent12: hslToComponents(tomatoDark.tomato12),

  textGrayOnBaseLowContrast: hslToComponents(oliveDark.olive11),
  textGrayOnBase: hslToComponents(oliveDark.olive12),

  textGrayOnAccentLowContrast: hslToComponents(mauveDark.mauve11),
  textGrayOnAccent: hslToComponents(mauveDark.mauve12),

  textBaseOnBaseLowContrast: hslToComponents(grassDark.grass11),
  textBaseOnBase: hslToComponents(grassDark.grass12),

  textBaseOnAccentLowContrast: hslToComponents(grassDark.grass11),
  textBaseOnAccent: hslToComponents(grassDark.grass12),

  textAccentOnBaseLowContrast: hslToComponents(tomatoDark.tomato11),
  textAccentOnBase: hslToComponents(tomatoDark.tomato12),

  textAccentOnAccentLowContrast: hslToComponents(tomatoDark.tomato11),
  textAccentOnAccent: hslToComponents(tomatoDark.tomato12),

  base9Gradient: () => {
    let base = hslToComponents(grassDark.grass9)
    return {
      hue: base.hue,// + Math.random()*80 - 40,
      saturation: base.saturation + Math.random()*80 - 40,
      lightness: base.lightness + Math.random()*100 - 50,
    }
  },
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

  textGrayOnBaseLowContrast: hslToComponents(slate.slate11),
  textGrayOnBase: hslToComponents(slate.slate12),

  textGrayOnAccentLowContrast: hslToComponents(mauveDark.mauve11),
  textGrayOnAccent: hslToComponents(mauveDark.mauve12),

  textBaseOnBaseLowContrast: hslToComponents(skyDark.sky11),
  textBaseOnBase: hslToComponents(skyDark.sky12),

  textBaseOnAccentLowContrast: hslToComponents(sky.sky11),
  textBaseOnAccent: hslToComponents(sky.sky12),

  textAccentOnBaseLowContrast: hslToComponents(orange.orange11),
  textAccentOnBase: hslToComponents(orange.orange12),

  textAccentOnAccentLowContrast: hslToComponents(orangeDark.orange11),
  textAccentOnAccent: hslToComponents(orangeDark.orange12),

  base9Gradient: () => {
    let base = hslToComponents(sky.sky9)
    let accent = hslToComponents(orange.orange9)
    return {
      hue: base.hue,
      saturation: base.saturation + Math.random()*80 - 40,
      lightness: base.lightness + Math.random()*100 - 50,
    }
  },
}


const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)")

let themeLight = theme_Sky_Orange_slate
let themeDark = theme_GrassDark_Tomato_olive
let theme = darkModePreference.matches ? themeDark : themeLight

darkModePreference.addEventListener('change', event => {
  theme = event.matches ? themeDark : themeLight
  setCSSColors()
  initializeBackground()
})

let PIXELATED_FINE_BOX_SIZE = 1
let PIXELATED_LARGE_BOX_SIZE = 8
let PIXELATED_SUPER_BOX_SIZE = 64
let PIXELATION_RATIO_SUPER_LARGE = Math.floor(PIXELATED_SUPER_BOX_SIZE/PIXELATED_LARGE_BOX_SIZE)
let PIXELATION_RATIO_LARGE_FINE = Math.floor(PIXELATED_LARGE_BOX_SIZE/PIXELATED_FINE_BOX_SIZE)
let PIXELATION_RATIO_LARGE_SUPER = Math.ceil(PIXELATED_LARGE_BOX_SIZE/PIXELATED_LARGE_BOX_SIZE)

let MULT_SUPER_SELF = 1
let MULT_SUPER_FAMILY = 10

let MULT_LARGE_TRANSDIM = 4
let MULT_LARGE_SELF = 1
let MULT_LARGE_FAMILY = 10

let MULT_PIXEL_TANSDIM = 4
let MULT_PIXEL_SELF = 1
let MULT_PIXEL_FAMILY = 20

let SMOOTHED_BOX_SIZE = 10

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
async function initializeBackground() {
  canvasPixelElement.width = canvasPixelElement.clientWidth;
  canvasPixelElement.height = canvasPixelElement.clientHeight;
  canvasSmoothElement.width = canvasSmoothElement.clientWidth;
  canvasSmoothElement.height = canvasSmoothElement.clientHeight;

  canvasPixelContext.clearRect(0, 0, canvasPixelElement.width, canvasPixelElement.height)
  canvasSmoothContext.clearRect(0, 0, canvasPixelElement.width, canvasPixelElement.height)

  pixelColumnsSuper = []
  pixelColumnsLarge = []
  pixelColumnsFine = []
  doneAnimatingCurtain = false

  widthInLargePixels = Math.ceil(canvasPixelElement.width/PIXELATED_LARGE_BOX_SIZE) + 1
  heightInLargePixels = Math.ceil(canvasPixelElement.height/PIXELATED_LARGE_BOX_SIZE) + 1
  widthInSuperPixels = widthInLargePixels*PIXELATION_RATIO_LARGE_SUPER
  heightInSuperPixels = heightInLargePixels*PIXELATION_RATIO_LARGE_SUPER
  widthInFinePixels = widthInLargePixels*PIXELATION_RATIO_LARGE_FINE
  heightInFinePixels = heightInLargePixels*PIXELATION_RATIO_LARGE_FINE


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

  /*
    Take the begining offsets and initialize the columns
  */
  for (let i=0; i < widthInSuperPixels; i++) {
    pixelColumnsSuper.push(
      new Array(Math.floor(gaussianSumsPixelsSuper[i]*30)).fill(theme.base9Gradient()),
    )
  }
  await paintPixelsSuper()
  for (let i=0; i < widthInLargePixels; i++) {
    pixelColumnsLarge.push(
      new Array(Math.floor(gaussianSumsPixelsLarge[i]*30)).fill(theme.base9Gradient()),
    )
  }
  await paintPixelsLarge()
  for (let i=0; i < widthInFinePixels; i++) {
    pixelColumnsFine.push(
      new Array(Math.floor(gaussianSumsPixelsFine[i]*30)).fill(theme.base9Gradient()),
    )
  }
  await paintPixelsFine()

}



async function initializeCurtain() {

  let countToAddSmoothed = widthInLargePixels*PIXELATED_LARGE_BOX_SIZE/SMOOTHED_BOX_SIZE

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

  gaussianObjects = []
  for (let index=0; index < countToAddSmoothed; index++) {
    gaussianObjects.push({
        position: gaussianSumsPosition[index] - 500*(Math.abs(index-0.15*countToAddSmoothed))/countToAddSmoothed,
        velocity: gaussianSumsVelocity[index],
        acceleration: gaussianSumsAcceleration[index],
        jolt: gaussianSumsJolt[index],
      })
  }

  window.requestAnimationFrame(renderLoop)
}

async function renderLoop() {
  let done = await renderScene();
  let continueToNextFrame = !done
  if (continueToNextFrame) {
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
  let color = theme.base9Gradient()

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

    let multiplierSum = MULT_SUPER_SELF + MULT_SUPER_FAMILY

    let red =
      MULT_SUPER_SELF * color.hue
      + MULT_SUPER_FAMILY * colorToTint.r
    let green =
      MULT_SUPER_SELF * color.saturation
      + MULT_SUPER_FAMILY * colorToTint.g
    let blue =
      MULT_SUPER_SELF * color.lightness
      + MULT_SUPER_FAMILY * colorToTint.b

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
  let color = theme.base9Gradient()

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

    let multiplierSum = MULT_LARGE_TRANSDIM + MULT_LARGE_SELF + MULT_LARGE_FAMILY

    let red =
      MULT_LARGE_TRANSDIM * transdimensionalAncestorColor.hue
      + MULT_LARGE_SELF * color.hue
      + MULT_LARGE_FAMILY * colorToTint.r
    let green =
      MULT_LARGE_TRANSDIM * transdimensionalAncestorColor.saturation
      + MULT_LARGE_SELF * color.saturation
      + MULT_LARGE_FAMILY * colorToTint.g
    let blue =
      MULT_LARGE_TRANSDIM * transdimensionalAncestorColor.lightness
      + MULT_LARGE_SELF * color.lightness
      + MULT_LARGE_FAMILY * colorToTint.b

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
  let color = theme.base9Gradient()

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

    let multiplierSum = MULT_PIXEL_TANSDIM + MULT_PIXEL_SELF + MULT_PIXEL_FAMILY

    let red =
      MULT_PIXEL_TANSDIM * transdimensionalAncestorColor.hue
      + MULT_PIXEL_SELF * color.hue
      + MULT_PIXEL_FAMILY * colorToTint.r
    let green =
      MULT_PIXEL_TANSDIM * transdimensionalAncestorColor.saturation
      + MULT_PIXEL_SELF * color.saturation
      + MULT_PIXEL_FAMILY * colorToTint.g
    let blue =
      MULT_PIXEL_TANSDIM * transdimensionalAncestorColor.lightness
      + MULT_PIXEL_SELF * color.lightness
      + MULT_PIXEL_FAMILY * colorToTint.b

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
  //canvasSmoothContext.restore()
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

function setCSSColors() {
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


  bs.setProperty("--textGrayOnBaseLowContrast", componentsTohsl(theme.textGrayOnBaseLowContrast))
  bs.setProperty("--textGrayOnBase", componentsTohsl(theme.textGrayOnBase))

  bs.setProperty("--textGrayOnAccentLowContrast", componentsTohsl(theme.textGrayOnAccentLowContrast))
  bs.setProperty("--textGrayOnAccent", componentsTohsl(theme.textGrayOnAccent))


  bs.setProperty("--textBaseOnBaseLowContrast", componentsTohsl(theme.textBaseOnBaseLowContrast))
  bs.setProperty("--textBaseOnBase", componentsTohsl(theme.textBaseOnBase))

  bs.setProperty("--textBaseOnAccentLowContrast", componentsTohsl(theme.textBaseOnAccentLowContrast))
  bs.setProperty("--textBaseOnAccent", componentsTohsl(theme.textBaseOnAccent))


  bs.setProperty("--textAccentOnBaseLowContrast", componentsTohsl(theme.textAccentOnBaseLowContrast))
  bs.setProperty("--textAccentOnBase", componentsTohsl(theme.textAccentOnBase))

  bs.setProperty("--textAccentOnAccentLowContrast", componentsTohsl(theme.textAccentOnAccentLowContrast))
  bs.setProperty("--textAccentOnAccent", componentsTohsl(theme.textAccentOnAccent))
}

onMounted(async () => {
  console.log("Hello, world!")
  setCSSColors()

  canvasPixelElement = document.getElementById('lowres-canvas') as HTMLCanvasElement
  canvasPixelContext = canvasPixelElement.getContext("2d")!
  canvasSmoothElement = document.getElementById('highres-canvas') as HTMLCanvasElement
  canvasSmoothContext = canvasSmoothElement.getContext("2d")!
  
  initializeBackground()
  initializeCurtain()
  //await new Promise(resolve => setTimeout(resolve, 400))
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
