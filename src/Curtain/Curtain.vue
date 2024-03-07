<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Mutex } from 'async-mutex';


// @ts-ignore
import{ Smooth } from '../assets/Smooth'

import type { Color, Rainbow } from './Types';
import { BackgroundState, RainbowDirection } from './Types';

/*backgroundColors: [
  { stop: 0/6, color: hslToComponents(red.red9) },
  { stop: 1/6, color: hslToComponents(orange.orange9) },
  { stop: 2/6, color: hslToComponents(yellow.yellow9) },
  { stop: 3/6, color: hslToComponents(green.green9) },
  { stop: 4/6, color: hslToComponents(blue.blue9) },
  { stop: 5/6, color: hslToComponents(indigo.indigo9) },
  { stop: 6/6, color: hslToComponents(violet.violet9) },
],*/

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

let canvasContext: CanvasRenderingContext2D
let canvasElement: HTMLCanvasElement

/*
  Rendering functions
*/
async function initializeBackground() {
canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height)

  if (canvasElement.width != canvasElement.clientWidth) {
    canvasElement.width = canvasElement.clientWidth;
    canvasElement.height = canvasElement.clientHeight;
  }


  pixelColumnsSuper = []
  pixelColumnsLarge = []
  pixelColumnsFine = []
  doneAnimatingCurtain = false

  widthInLargePixels = Math.ceil(canvasElement.width/PIXELATED_LARGE_BOX_SIZE) + 1
  heightInLargePixels = Math.ceil(canvasElement.height/PIXELATED_LARGE_BOX_SIZE) + 1
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
}



async function initializeCurtain() {
  doneAnimatingCurtain = false
  let countToAddSmoothed = widthInLargePixels*PIXELATED_LARGE_BOX_SIZE/SMOOTHED_BOX_SIZE

  let curve = {
      pos: { low: -300, high: 0 },
      velo: { low: 0, high: 5 },
      acc: { low: 5, high: 10 },
      jolt: { low: -5, high: 5 },
    }

  let gaussianSumsPosition: number[] = gaussians(
    countToAddSmoothed,
    () => {return Math.random()*90 + 10},
    curve.pos.low, curve.pos.high
  )
  let gaussianSumsVelocity: number[] = gaussians(
    countToAddSmoothed,
    () => {return Math.random()*90 + 10},
    curve.velo.low*(1/10), curve.velo.high*(1/10)
  )
  let gaussianSumsAcceleration: number[] = gaussians(
    countToAddSmoothed,
    () => {return Math.random()*90 + 10},
    curve.acc.low*(1/1000), curve.acc.high*(1/1000)
  )
  let gaussianSumsJolt: number[] = gaussians(
    countToAddSmoothed,
    () => {return Math.random()*90 + 10},
    curve.jolt.low*(1/1000000), curve.jolt.high*(1/1000000)
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

  if (clientWidthInitial != canvasElement.clientWidth) {
    clientWidthInitial = canvasElement.clientWidth
    clientHeightInitial = canvasElement.clientHeight
  }
}

let clientWidthInitial = 0
let clientHeightInitial = 0

async function renderLoop() {
  let state: AnimationState|null = null
  await pauseMutex.runExclusive(async () => {
    if (playStateInternal == BackgroundState.AfterFirstPaused) {
      return
    }
    state = await renderScene();
    if (state == AnimationState.Inside) {
      window.requestAnimationFrame(renderLoop)
    }
  })
  if (state == AnimationState.AboveTop) {
      renderLoop()
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
  renderedPixelsFine = canvasContext.createImageData(widthInFinePixels, heightInFinePixels)
  for (let key in pixelColumnsFine) {
    renderColumn(Number(key))
  }
  backgroundPattern = canvasContext.createPattern(await createImageBitmap(renderedPixelsFine), "no-repeat")
  //canvasPixelContext.putImageData(renderedPixelsFine, 0, 0)
}
let backgroundPattern: CanvasPattern|null = null

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

enum AnimationState {
  AboveTop,
  Inside,
  BelowBottom,
}

let doneAnimatingCurtain = false
async function renderScene(): Promise<AnimationState> {
  if (doneAnimatingCurtain) {
    return AnimationState.BelowBottom
  }
  for (let index=0; index < gaussianObjects.length; index++) {
    gaussianObjects[index].acceleration += gaussianObjects[index].jolt
    gaussianObjects[index].velocity += gaussianObjects[index].acceleration
    //friction
    gaussianObjects[index].velocity *= 0.999
    gaussianObjects[index].position += gaussianObjects[index].velocity
  }

  //@ts-ignore
  let gaussionSmoothed = Smooth(gaussianObjects.map(objct => objct.position))

  //canvasContext.clearRect(0, 0, clientWidthInitial, clientHeightInitial);

  canvasContext.beginPath()
  let index=0
  canvasContext.moveTo(index, gaussionSmoothed(index))
  let eachIsAbove = true
  let eachIsBelow = true
  index++
  for (; index < gaussianObjects.length*SMOOTHED_BOX_SIZE; index++) {
    let smoothedPoint = gaussionSmoothed(index/SMOOTHED_BOX_SIZE)
    canvasContext.lineTo(index, smoothedPoint)
    if (smoothedPoint >= -5 ) {
      eachIsAbove = false
    }
    if (smoothedPoint <= clientHeightInitial + 5 ) {
      eachIsBelow = false
    }
  }

  canvasContext.lineTo(clientWidthInitial, 0)
  canvasContext.lineTo(0, 0)
  canvasContext.closePath()

  canvasContext.shadowColor = "rgba(0, 0, 0, 0.2)"
  canvasContext.shadowOffsetX = 5
  canvasContext.shadowOffsetY = 15
  canvasContext.shadowBlur = 20
  canvasContext.fillStyle = backgroundPattern ?? "black"
  canvasContext.fill()
  canvasContext.createPattern
  //canvasSmoothContext.restore()

  if (eachIsAbove) {
    return AnimationState.AboveTop
  }
  if (eachIsBelow) {
    playStateInternal = BackgroundState.AfterFirstPaused
    emit('curtainCall', '')
    doneAnimatingCurtain = true
    return AnimationState.BelowBottom
  }

  return AnimationState.Inside
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
      x: pixelData.position.x/canvasElement.width,
      y: pixelData.position.y/canvasElement.height
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

//#region Helper Functions
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

function colorOffsetPlusThemePositionToHsl(offset: ColorOffset, position: Position): Color {
  let positionalPercentage: number
  if (rainbow.dir == RainbowDirection.Regular) {
    positionalPercentage = (position.x + position.y)/2
  } else {
    positionalPercentage = (1-position.x + position.y)/2
  }
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

  for (let index=0; index < rainbow.stops.length; index++) {
    if (rainbow.stops[index].stop > percentage) {
      let stopA = rainbow.stops[index-1]
      let stopB = rainbow.stops[index]

      let lengthBetweenStops = stopB.stop-stopA.stop
      let lengthSinceStopA = percentage - stopA.stop
      percentageAlongSection = lengthSinceStopA/lengthBetweenStops
      colorA = stopA.color
      colorB = stopB.color
      break
    }
  }
  if (!colorA || !colorB || !percentageAlongSection) { 
    return rainbow.stops[0].color
  }
  let hue: number
  let saturation: number
  let lightness: number
  if (Math.abs(colorA.hue - colorB.hue) < 360/2) {
    //linear from A to B
    hue = colorA.hue*(1-percentageAlongSection) + colorB.hue*percentageAlongSection
    saturation = colorA.saturation*(1-percentageAlongSection) + colorB.saturation*percentageAlongSection
    lightness = colorA.lightness*(1-percentageAlongSection) + colorB.lightness*percentageAlongSection
  } else {
    //linear from A to B through 0/360
     
    let colorHigh: Color
    let colorLow: Color
    let targetHue: number
    if (colorA.hue > colorB.hue) {
      colorHigh = colorA
      colorLow = colorB
    } else {
      colorHigh = colorB
      colorLow = colorA
      percentageAlongSection = 1 - percentageAlongSection
    }
    saturation = colorHigh.saturation*(1-percentageAlongSection) + colorLow.saturation*percentageAlongSection
    lightness = colorHigh.lightness*(1-percentageAlongSection) + colorLow.lightness*percentageAlongSection
    targetHue = 360 + colorLow.hue
    let hueUnsliced = colorHigh.hue*(1-percentageAlongSection) + targetHue*percentageAlongSection
    if (hueUnsliced < 360) {
      hue = hueUnsliced
    } else {
      hue = hueUnsliced - 360
    }
  }

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

//#endregion

onMounted(async () => {
  //@ts-expect-error
  canvasElement = canvasRef.value
  canvasContext = canvasElement.getContext("2d")! 
})

/*onUnmounted(() => {
  window.removeEventListener("resize", resizedWindow)
})

window.addEventListener("resize", resizedWindow)*/

const canvasRef = ref(null)

let rainbow: Rainbow

const loadCurtain = async (rainbowIn: Rainbow) => {
  rainbow = rainbowIn
  await initializeBackground()
  await initializeCurtain()
}

const playCurtain = async () => {
  //canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height)
  if (playStateInternal != BackgroundState.First) {
    playStateInternal = BackgroundState.AfterFirstPlaying
  }
  await paintPixelsFine()    
  window.requestAnimationFrame(renderLoop)
}

let playStateInternal = BackgroundState.Unset
const pauseMutex = new Mutex()
const pausePlay = async (): Promise<BackgroundState> => {
  return await pauseMutex.runExclusive(() => {
    switch (playStateInternal) {
      case BackgroundState.First:
        return BackgroundState.First
      case BackgroundState.AfterFirstPlaying:
      playStateInternal = BackgroundState.AfterFirstPaused
        return BackgroundState.AfterFirstPaused
      case BackgroundState.Unset:
        // eslint-disable-next-line no-fallthrough
      case BackgroundState.AfterFirstPaused:
        playStateInternal = BackgroundState.AfterFirstPlaying
          doneAnimatingCurtain = false
          window.requestAnimationFrame(renderLoop)
          return BackgroundState.AfterFirstPlaying
    }
  })
  //return BackgroundState.AfterFirstPaused
}

const emit = defineEmits([
  'curtainCall',
]);
defineExpose({ 
  loadCurtain,
  playCurtain,
  pausePlay,
 })
 const props = defineProps({
  playState: {
    type: Number,
    default: BackgroundState.AfterFirstPaused
  }
 })
</script>

<template>
  <div id='canvas-holder'>
    <canvas class="the-canvas" ref="canvasRef"/>
  </div>
</template>

<style scoped>
.the-canvas {
  position: absolute;
  left: -25px;
  top: -25px;
  width: calc(100vw + 50px);
  height: calc(100vh + 50px);
  overflow: clip;
}
</style>