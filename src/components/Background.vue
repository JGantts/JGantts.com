<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
// @ts-ignore
import{ Smooth } from '../assets/Smooth'
import {
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

  // Slate
  slate,
  slateDark,

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

  teal,
  tealDark,
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

  backgroundColors: { stop: number, color: Color}[]
}

/*backgroundColors: [
  { stop: 0/6, color: hslToComponents(red.red9) },
  { stop: 1/6, color: hslToComponents(orange.orange9) },
  { stop: 2/6, color: hslToComponents(yellow.yellow9) },
  { stop: 3/6, color: hslToComponents(green.green9) },
  { stop: 4/6, color: hslToComponents(blue.blue9) },
  { stop: 5/6, color: hslToComponents(indigo.indigo9) },
  { stop: 6/6, color: hslToComponents(violet.violet9) },
],*/

let theme_BlueDark_slate__Tomato_mauve: Theme = {
  base1: hslToComponents(blueDark.blue1),
  base2: hslToComponents(blueDark.blue2),
  base3: hslToComponents(blueDark.blue3),
  base4: hslToComponents(blueDark.blue4),
  base5: hslToComponents(blueDark.blue5),
  base6: hslToComponents(blueDark.blue6),
  base7: hslToComponents(blueDark.blue7),
  base8: hslToComponents(blueDark.blue8),
  base9: hslToComponents(blueDark.blue9),
  base10: hslToComponents(blueDark.blue10),
  base11: hslToComponents(blueDark.blue11),
  base12: hslToComponents(blueDark.blue12),

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

  textGrayOnBaseLowContrast: hslToComponents(slateDark.slate11),
  textGrayOnBase: hslToComponents(slateDark.slate12),

  textGrayOnAccentLowContrast: hslToComponents(mauveDark.mauve11),
  textGrayOnAccent: hslToComponents(mauveDark.mauve12),

  textBaseOnBaseLowContrast: hslToComponents(grassDark.grass11),
  textBaseOnBase: hslToComponents(grassDark.grass12),

  textBaseOnAccentLowContrast: hslToComponents(grassDark.grass11),
  textBaseOnAccent: hslToComponents(grassDark.grass12),

  textAccentOnBaseLowContrast: hslToComponents(tomatoDark.tomato11),
  textAccentOnBase: hslToComponents(tomatoDark.tomato11),

  textAccentOnAccentLowContrast: hslToComponents(tomatoDark.tomato11),
  textAccentOnAccent: hslToComponents(tomatoDark.tomato12),

  backgroundColors: [
    { stop: 0, color: hslToComponents(sky.sky10) },
    { stop: 0.45, color: hslToComponents(blue.blue10) },
    { stop: 0.5, color: hslToComponents(blue.blue10) },
    { stop: 0.6, color: hslToComponents(blue.blue10) },
    { stop: 1, color: hslToComponents(grass.grass10) },
  ]
}

let theme_Blue_slate__Orange_sand: Theme = {
  base1: hslToComponents(blue.blue1),
  base2: hslToComponents(blue.blue2),
  base3: hslToComponents(blue.blue3),
  base4: hslToComponents(blue.blue4),
  base5: hslToComponents(blue.blue5),
  base6: hslToComponents(blue.blue6),
  base7: hslToComponents(blue.blue7),
  base8: hslToComponents(blue.blue8),
  base9: hslToComponents(blue.blue9),
  base10: hslToComponents(blue.blue10),
  base11: hslToComponents(blue.blue11),
  base12: hslToComponents(blue.blue12),

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

  textGrayOnAccentLowContrast: hslToComponents(sandDark.sand11),
  textGrayOnAccent: hslToComponents(sandDark.sand12),

  textBaseOnBaseLowContrast: hslToComponents(blueDark.blue11),
  textBaseOnBase: hslToComponents(blueDark.blue12),

  textBaseOnAccentLowContrast: hslToComponents(blue.blue11),
  textBaseOnAccent: hslToComponents(blue.blue12),

  textAccentOnBaseLowContrast: hslToComponents(orange.orange11),
  textAccentOnBase: hslToComponents(orange.orange10),

  textAccentOnAccentLowContrast: hslToComponents(orangeDark.orange11),
  textAccentOnAccent: hslToComponents(orangeDark.orange12),

  /*backgroundColors: [
    { stop: 0/6, color: hslToComponents(red.red9) },
    { stop: 1/6, color: hslToComponents(orange.orange9) },
    { stop: 2/6, color: hslToComponents(yellow.yellow9) },
    { stop: 3/6, color: hslToComponents(green.green9) },
    { stop: 4/6, color: hslToComponents(blue.blue9) },
    { stop: 5/6, color: hslToComponents(indigo.indigo9) },
    { stop: 6/6, color: hslToComponents(violet.violet9) },
  ],*/
  backgroundColors: [
    { stop: 0, color: hslToComponents(sky.sky5) },
    { stop: 0.45, color: hslToComponents(blue.blue8) },
    { stop: 0.5, color: hslToComponents(blue.blue8) },
    { stop: 0.6, color: hslToComponents(blue.blue8) },
    { stop: 1, color: hslToComponents(green.green8) },
  ],
}

const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)")

let themeLight = theme_Blue_slate__Orange_sand
let themeDark = theme_BlueDark_slate__Tomato_mauve
let theme = darkModePreference.matches ? themeDark : themeLight

darkModePreference.addEventListener('change', event => {
  theme = event.matches ? themeDark : themeLight
  setCSSColors()
  paintPixelsFine()
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

let SMOOTHED_BOX_SIZE = 6

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

type ColorOffset = {
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
let pixelColumnsSuper: ColorOffset[][] = []
let pixelColumnsLarge: ColorOffset[][] = []
let pixelColumnsFine: ColorOffset[][] = []

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
      new Array(Math.floor(gaussianSumsPixelsSuper[i]*30)).fill(base9Gradient()),
    )
  }
  await reconPixelsSuper()
  for (let i=0; i < widthInLargePixels; i++) {
    pixelColumnsLarge.push(
      new Array(Math.floor(gaussianSumsPixelsLarge[i]*30)).fill(base9Gradient()),
    )
  }
  await reconPixelsLarge()
  for (let i=0; i < widthInFinePixels; i++) {
    pixelColumnsFine.push(
      new Array(Math.floor(gaussianSumsPixelsFine[i]*30)).fill(base9Gradient()),
    )
  }
  await reconPixelsFine()

  await paintPixelsFine()
}



async function initializeCurtain() {
  console.log("hi")
  doneAnimatingCurtain = false
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


async function reconPixelsSuper() {
  while ((pixelColumnsSuper[0].length-TOP_BUFFER_PIXEL*2) < heightInSuperPixels) {
    for (let key in pixelColumnsSuper) {
      calculateColumnSuper(Number(key))
    }
  }
}

async function reconPixelsLarge() {
  while ((pixelColumnsLarge[0].length-TOP_BUFFER_PIXEL*2) < heightInLargePixels) {
    for (let key in pixelColumnsLarge) {
      calculateColumnLarge(Number(key))
    }
  }
}

async function reconPixelsFine() {
  while ((pixelColumnsFine[0].length-TOP_BUFFER_PIXEL*2) < heightInFinePixels) {
    for (let key in pixelColumnsFine) {
      calculateColumnFine(Number(key))
    }
  }
}

  //@ts-expect-error
let renderedPixelsFine = null

async function paintPixelsFine() {
  renderedPixelsFine = canvasPixelContext.createImageData(widthInFinePixels, heightInFinePixels)
  console.log(renderedPixelsFine)
  for (let key in pixelColumnsFine) {
    renderColumn(Number(key))
  }
  console.log(renderedPixelsFine)
  canvasPixelContext.putImageData(renderedPixelsFine, 0, 0)
}

async function calculateColumnSuper(index: number) { 
  let column = pixelColumnsSuper[index]

  /*
    Add new box
  */

  /* random color */
  let color = base9Gradient()

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
  let colorToTint: ColorOffset = {
    saturation: 0,
    lightness: 0
  }
  let colorsAdded = 0
  if (parent) {
    colorToTint.saturation += parent.saturation
    colorToTint.lightness += parent.lightness
    colorsAdded += 1
  }
  if (leftCousin) {
    colorToTint.saturation += leftCousin.saturation
    colorToTint.lightness += leftCousin.lightness
    colorsAdded += 1
  }
  if (rightCousin) {
    colorToTint.saturation += rightCousin.saturation
    colorToTint.lightness += rightCousin.lightness
    colorsAdded += 1
  }
  if(colorsAdded != 0) {
    colorToTint.saturation /= colorsAdded
    colorToTint.lightness /= colorsAdded

    let multiplierSum = MULT_SUPER_SELF + MULT_SUPER_FAMILY

    let saturation =
      MULT_SUPER_SELF * color.saturation
      + MULT_SUPER_FAMILY * colorToTint.saturation
    let lightness =
      MULT_SUPER_SELF * color.lightness
      + MULT_SUPER_FAMILY * colorToTint.lightness

    saturation = Math.floor(saturation/multiplierSum)
    lightness = Math.floor(lightness/multiplierSum)

    color.saturation = saturation
    color.lightness = lightness
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

  let transdimensionalAncestorColor: ColorOffset = transdimensionalAncestorColumn[Math.floor(column.length/PIXELATION_RATIO_SUPER_LARGE)+TOP_BUFFER_PIXEL]
  let color = base9Gradient()

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
  let colorToTint: ColorOffset = {
    saturation: 0,
    lightness: 0
  }
  let colorsAdded = 0
  if (parent) {
    colorToTint.saturation += parent.saturation
    colorToTint.lightness += parent.lightness
    colorsAdded += 1
  }
  if (leftCousin) {
    colorToTint.saturation += leftCousin.saturation
    colorToTint.lightness += leftCousin.lightness
    colorsAdded += 1
  }
  if (rightCousin) {
    colorToTint.saturation += rightCousin.saturation
    colorToTint.lightness += rightCousin.lightness
    colorsAdded += 1
  }
  if(colorsAdded != 0) {
    colorToTint.saturation /= colorsAdded
    colorToTint.lightness /= colorsAdded

    let multiplierSum = MULT_LARGE_TRANSDIM + MULT_LARGE_SELF + MULT_LARGE_FAMILY

    let saturation =
      MULT_LARGE_TRANSDIM * transdimensionalAncestorColor.saturation
      + MULT_LARGE_SELF * color.saturation
      + MULT_LARGE_FAMILY * colorToTint.saturation
    let lightness =
      MULT_LARGE_TRANSDIM * transdimensionalAncestorColor.lightness
      + MULT_LARGE_SELF * color.lightness
      + MULT_LARGE_FAMILY * colorToTint.lightness

    saturation = Math.floor(saturation/multiplierSum)
    lightness = Math.floor(lightness/multiplierSum)

    color.saturation = saturation
    color.lightness = lightness
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

  let transdimensionalAncestorColor: ColorOffset = transdimensionalAncestorColumn[Math.floor(column.length/PIXELATION_RATIO_LARGE_FINE)+TOP_BUFFER_PIXEL]
  let color = base9Gradient()

  if (!transdimensionalAncestorColor) {
    transdimensionalAncestorColor = {
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
  let colorToTint: ColorOffset = {
    saturation: 0,
    lightness: 0
  }
  let colorsAdded = 0
  if (parent) {
    colorToTint.saturation += parent.saturation
    colorToTint.lightness += parent.lightness
    colorsAdded += 1
  }
  if (leftCousin) {
    colorToTint.saturation += leftCousin.saturation
    colorToTint.lightness += leftCousin.lightness
    colorsAdded += 1
  }
  if (rightCousin) {
    colorToTint.saturation += rightCousin.saturation
    colorToTint.lightness += rightCousin.lightness
    colorsAdded += 1
  }
  if(colorsAdded != 0) {
    colorToTint.saturation /= colorsAdded
    colorToTint.lightness /= colorsAdded

    let multiplierSum = MULT_PIXEL_TANSDIM + MULT_PIXEL_SELF + MULT_PIXEL_FAMILY

    let saturation =
      MULT_PIXEL_TANSDIM * transdimensionalAncestorColor.saturation
      + MULT_PIXEL_SELF * color.saturation
      + MULT_PIXEL_FAMILY * colorToTint.saturation
    let lightness =
      MULT_PIXEL_TANSDIM * transdimensionalAncestorColor.lightness
      + MULT_PIXEL_SELF * color.lightness
      + MULT_PIXEL_FAMILY * colorToTint.lightness

    saturation = Math.floor(saturation/multiplierSum)
    lightness = Math.floor(lightness/multiplierSum)

    color.saturation = saturation
    color.lightness = lightness
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
    if (gaussianObjects[index].position < canvasPixelElement.height + 20 ) {
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

  canvasSmoothContext.fillStyle = componentsToHsl(theme.base3)
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
    color: ColorOffset
}) {
  let left = (pixelData.position.x)*PIXELATED_FINE_BOX_SIZE
  let top = (pixelData.position.y)*PIXELATED_FINE_BOX_SIZE

  //canvasPixelContext.clearRect(left, top, PIXELATED_FINE_BOX_SIZE, PIXELATED_FINE_BOX_SIZE)

  let pixelColor = colorOffsetPlusThemePositionToHsl(
    pixelData.color, 
    {
      x: pixelData.position.x/canvasPixelElement.width,
      y: pixelData.position.y/canvasPixelElement.height
    }
  )
  let rgb = HSLToRGB(pixelColor.hue, pixelColor.saturation, pixelColor.lightness)

  let i = left + top * widthInFinePixels
  i *= 4
  //@ts-expect-error
  renderedPixelsFine.data[i + 0] = rgb[0]
  //@ts-expect-error
  renderedPixelsFine.data[i + 1] = rgb[1]
  //@ts-expect-error
  renderedPixelsFine.data[i + 2] = rgb[2]
  //@ts-expect-error
  renderedPixelsFine.data[i + 3] = 255
}

/*
  Helper functions
*/
  //@ts-expect-error
const HSLToRGB = (h, s, l) => {
  s /= 100;
  l /= 100;
  //@ts-expect-error
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  //@ts-expect-error
  const f = n =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [255 * f(0), 255 * f(8), 255 * f(4)];
};

function base9Gradient(): ColorOffset {
    return {
      saturation: Math.random()*80 - 40,
      lightness: Math.random()*100 - 50,
    }
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

function componentsToHsl(color: Color): string {
  return `hsl(${color.hue}, ${color.saturation}%, ${color.lightness}%)`
}

function colorOffsetPlusThemePositionToHsl(offset: ColorOffset, position: Position): Color {
  let positionalPercentage = (position.x + position.y)/2
  if (positionalPercentage < 0) {
    positionalPercentage = 0
  }
  let colorBase = gradientAtPercentage(positionalPercentage)
  let color: Color = {
    hue: jganttsHue(offset.lightness, positionalPercentage, colorBase),
    saturation: jganttsSaturation(offset.saturation, positionalPercentage, colorBase),
    lightness: jganttsLightness(offset.lightness, positionalPercentage, colorBase)
  }
  return color
}

//Function only works when hues differentials don't cross 0/360
function gradientAtPercentage(percentage: number): Color {
  let colorA: Color|null = null
  let colorB: Color|null = null
  let percentageAlongSection: number|null = null

  for (let index=0; index < theme.backgroundColors.length; index++) {
    if (theme.backgroundColors[index].stop > percentage) {
      let stopA = theme.backgroundColors[index-1]
      let stopB = theme.backgroundColors[index]

      let lengthBetweenStops = stopB.stop-stopA.stop
      let lengthSinceStopA = percentage - stopA.stop
      percentageAlongSection = lengthSinceStopA/lengthBetweenStops
      colorA = stopA.color
      colorB = stopB.color
      break
    }
  }
  if (!colorA || !colorB || !percentageAlongSection) { 
    return theme.backgroundColors[0].color
  }
  let hue = colorA.hue*(1-percentageAlongSection) + colorB.hue*percentageAlongSection
  let saturation = colorA.saturation*(1-percentageAlongSection) + colorB.saturation*percentageAlongSection
  let lightness = colorA.lightness*(1-percentageAlongSection) + colorB.lightness*percentageAlongSection

  return {
    hue,
    saturation,
    lightness
  }
}

function jganttsHue(offset: number, positionalPercentage: number, colorBase: Color): number {
  let hue = colorBase.hue
  return hue
}
function jganttsSaturation(offset: number, positionalPercentage: number, colorBase: Color): number {
  return colorBase.saturation/1.2 + offset
}
function jganttsLightness(offset: number, positionalPercentage: number, colorBase: Color): number {
  let positionalLightness = (1-positionalPercentage)*0.2 + 0.8
  return (colorBase.lightness + offset)// * positionalLightness
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
  bs.setProperty("--base1", componentsToHsl(theme.base1))
  bs.setProperty("--base2", componentsToHsl(theme.base2))
  bs.setProperty("--base3", componentsToHsl(theme.base3))
  bs.setProperty("--base4", componentsToHsl(theme.base4))
  bs.setProperty("--base5", componentsToHsl(theme.base5))
  bs.setProperty("--base6", componentsToHsl(theme.base6))
  bs.setProperty("--base7", componentsToHsl(theme.base7))
  bs.setProperty("--base8", componentsToHsl(theme.base8))
  bs.setProperty("--base9", componentsToHsl(theme.base9))
  bs.setProperty("--base10", componentsToHsl(theme.base10))
  bs.setProperty("--base11", componentsToHsl(theme.base11))
  bs.setProperty("--base12", componentsToHsl(theme.base12))

  bs.setProperty("--accent1", componentsToHsl(theme.accent1))
  bs.setProperty("--accent2", componentsToHsl(theme.accent2))
  bs.setProperty("--accent3", componentsToHsl(theme.accent3))
  bs.setProperty("--accent4", componentsToHsl(theme.accent4))
  bs.setProperty("--accent5", componentsToHsl(theme.accent5))
  bs.setProperty("--accent6", componentsToHsl(theme.accent6))
  bs.setProperty("--accent7", componentsToHsl(theme.accent7))
  bs.setProperty("--accent8", componentsToHsl(theme.accent8))
  bs.setProperty("--accent9", componentsToHsl(theme.accent9))
  bs.setProperty("--accent10", componentsToHsl(theme.accent10))
  bs.setProperty("--accent11", componentsToHsl(theme.accent11))
  bs.setProperty("--accent12", componentsToHsl(theme.accent12))


  bs.setProperty("--textGrayOnBaseLowContrast", componentsToHsl(theme.textGrayOnBaseLowContrast))
  bs.setProperty("--textGrayOnBase", componentsToHsl(theme.textGrayOnBase))

  bs.setProperty("--textGrayOnAccentLowContrast", componentsToHsl(theme.textGrayOnAccentLowContrast))
  bs.setProperty("--textGrayOnAccent", componentsToHsl(theme.textGrayOnAccent))


  bs.setProperty("--textBaseOnBaseLowContrast", componentsToHsl(theme.textBaseOnBaseLowContrast))
  bs.setProperty("--textBaseOnBase", componentsToHsl(theme.textBaseOnBase))

  bs.setProperty("--textBaseOnAccentLowContrast", componentsToHsl(theme.textBaseOnAccentLowContrast))
  bs.setProperty("--textBaseOnAccent", componentsToHsl(theme.textBaseOnAccent))


  bs.setProperty("--textAccentOnBaseLowContrast", componentsToHsl(theme.textAccentOnBaseLowContrast))
  bs.setProperty("--textAccentOnBase", componentsToHsl(theme.textAccentOnBase))

  bs.setProperty("--textAccentOnAccentLowContrast", componentsToHsl(theme.textAccentOnAccentLowContrast))
  bs.setProperty("--textAccentOnAccent", componentsToHsl(theme.textAccentOnAccent))
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

const reloadBackgound = () => {
  initializeBackground()
  initializeCurtain()
}

defineExpose({ reloadBackgound })
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
