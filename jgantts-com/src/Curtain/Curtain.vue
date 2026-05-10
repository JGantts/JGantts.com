<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Mutex } from 'async-mutex';


// @ts-ignore
import{ Smooth } from '../assets/Smooth'

import type { Color, Rainbow } from './Types';
import { BackgroundState, RainbowDirection } from './Types';

import { gaussian } from './gaussian';

const DEBUG = true

const log = DEBUG
  ? (...args: any[]) => console.log('[BG]', ...args)
  : () => {}

const warn = DEBUG
  ? (...args: any[]) => console.warn('[BG]', ...args)
  : () => {}

const error = DEBUG
  ? (...args: any[]) => console.error('[BG]', ...args)
  : () => {}

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

let SMOOTHED_BOX_SIZE = 6

let TOP_BUFFER_PIXEL = 34

type Position = {
  x: number,
  y: number 
}

type ColorOffset = {
  saturation: number, 
  lightness: number
}

/*
  Initialize variables
*/

//let gaussianObjects: GaussianObject[]
let gaussianObjects: {
  positions: number[]
  velocities: number[]
  accelerations: number[]
  jolts: number[]
} = {
  positions: [],
  velocities: [],
  accelerations: [],
  jolts: []
}

let canvasContext: CanvasRenderingContext2D
let canvasElement: HTMLCanvasElement


let resizeTimeout: ReturnType<typeof setTimeout> | undefined;

function throttledResizeHandler() {
  if (resizeTimeout) {
    return
  }
  resizedWindow();
  resizeTimeout = setTimeout(() => {
    clearTimeout(resizeTimeout);
  }, 200);
}
async function resizedWindow() {
  await initializeBackground()
}

let widthInSuperPixels = 0
let heightInSuperPixels = 0

let widthInLargePixels = 0
let heightInLargePixels = 0

let widthInFinePixels = 0
let heightInFinePixels = 0

function getViewportSize() {
  return {
    width: window.innerWidth || canvasElement.clientWidth,
    height: (window.innerHeight || canvasElement.clientHeight) + TOP_BUFFER_PIXEL,
  }
}


let pixelColumnsSuper: {saturation: number, lightness: number}[][] = []
let pixelColumnsLarge: {saturation: number, lightness: number}[][] = []
let pixelColumnsFine: {saturation: number, lightness: number}[][] = []

/*
  Rendering functions
*/
async function initializeBackground() {
  log("initializeBackground")
  const { width, height } = getViewportSize()

  doneAnimatingCurtain = false

  const ratio = window.devicePixelRatio || 1;
  if (canvasElement.width !== width * ratio || canvasElement.height !== height * ratio) {
    canvasElement.width = width * ratio;
    canvasElement.height = height * ratio;
    //canvasContext.scale(ratio, ratio);
  }
  
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

  let messageQueue: MessageEvent[] = [];
  let processingAllowed: boolean = false;
  let queueLock: Mutex = new Mutex()

  buildGradientLUT()

  async function handleWorkerMessage(event: MessageEvent) {
      log("handleWorkerMessage")
      pixelColumnsSuper = event.data.pixelColumnsSuper
      pixelColumnsLarge = event.data.pixelColumnsLarge
      pixelColumnsFine = event.data.pixelColumnsFine

      widthInLargePixels = event.data.widthInLargePixels
      heightInLargePixels = event.data.heightInLargePixels
      widthInSuperPixels = event.data.widthInSuperPixels
      heightInSuperPixels = event.data.heightInSuperPixels
      widthInFinePixels = event.data.widthInFinePixels
      heightInFinePixels = event.data.heightInFinePixels
      
      const playCurtain = async () => {
        if (playStateInternal != BackgroundState.First) {
          playStateInternal = BackgroundState.AfterFirstPlaying
        }
        await paintPixelsFine()
        window.requestAnimationFrame(renderLoop)
      }
      await initializeCurtain()
      emit('stageEntrance')
      playCurtain()
    }

  setTimeout(() => {
    queueLock.runExclusive(async () => {
        processingAllowed = true;
        // Process any messages that arrived during the delay
        for (const event of messageQueue) {
          handleWorkerMessage(event);
        }
        // Clear the message queue
        messageQueue = [];
      }
    )
  }, 3000);

  worker.onmessage = (event: MessageEvent): void => {
    log("worker.onmessage")
    queueLock.runExclusive(async () => {
      if (processingAllowed) {
        // If processing is allowed, handle the message immediately
        handleWorkerMessage(event);
      } else {
        // If not allowed yet, store the message in the queue
        messageQueue.push(event);
      }
    })
  }

  worker.postMessage({
    width: canvasElement.width,
    height: canvasElement.height,
  });
}



async function initializeCurtain() {
  log("initializeCurtain")
  doneAnimatingCurtain = false
  const ratio = window.devicePixelRatio || 1;
  let countToAddSmoothed = ratio*widthInLargePixels*PIXELATED_LARGE_BOX_SIZE/SMOOTHED_BOX_SIZE

  let curve = {
      pos: { low: -300, high: 0 },
      velo: { low: 0, high: 5 },
      acc: { low: 5, high: 10 },
      jolt: { low: -5, high: 5 },
    }

  let gaussianSumsPosition: number[] = gaussian(
    countToAddSmoothed,
    () => {return Math.random()*90 + 10},
    curve.pos.low, curve.pos.high
  )
  let gaussianSumsVelocity: number[] = gaussian(
    countToAddSmoothed,
    () => {return Math.random()*90 + 10},
    curve.velo.low*(1/10), curve.velo.high*(1/10)
  )
  let gaussianSumsAcceleration: number[] = gaussian(
    countToAddSmoothed,
    () => {return Math.random()*90 + 10},
    curve.acc.low*(1/1000), curve.acc.high*(1/1000)
  )
  let gaussianSumsJolt: number[] = gaussian(
    countToAddSmoothed,
    () => {return Math.random()*90 + 10},
    curve.jolt.low*(1/1000000), curve.jolt.high*(1/1000000)
  )

  //gaussianObjects = []
  for (let index=0; index < countToAddSmoothed; index++) {
    gaussianObjects.positions[index] = gaussianSumsPosition[index] - 500*(Math.abs(index-0.15*countToAddSmoothed))/countToAddSmoothed
    gaussianObjects.velocities[index] = gaussianSumsVelocity[index]
    gaussianObjects.accelerations[index] = gaussianSumsAcceleration[index]
    gaussianObjects.jolts[index] = gaussianSumsJolt[index]
  }

  positions = new Float32Array(gaussianObjects.positions.length)
  smoothedY = new Float32Array(gaussianObjects.positions.length)

  const { width, height } = getViewportSize()

  if (clientWidthInitial !== width * ratio || clientHeightInitial !== height * ratio) {
    clientWidthInitial = width * ratio
    clientHeightInitial = height * ratio
  }
}

let clientWidthInitial = 0
let clientHeightInitial = 0

let positions: Float32Array
let smoothedY: Float32Array

let state: AnimationState|null = null
async function renderLoop() {
  await pauseMutex.runExclusive(async () => {
    if (playStateInternal == BackgroundState.AfterFirstPaused) {
      return
    }
    do {
      log(state)
      state = await renderScene(state)
    } while(state == null || state == AnimationState.AboveTop)
    if (state == AnimationState.Inside) {
      window.requestAnimationFrame(renderLoop)
    }
  })
}

  //@ts-expect-error
let renderedPixelsFine = null
  //@ts-expect-error
let renderedPixelsFineAlpha = null

async function paintPixelsFine() {
  log("paintPixelsFine")
  renderedPixelsFine = canvasContext.createImageData(widthInFinePixels, heightInFinePixels)
  renderedPixelsFineAlpha = canvasContext.createImageData(widthInFinePixels, heightInFinePixels)
  for (let key in pixelColumnsFine) {
    renderColumn(Number(key))
  }
  backgroundPattern = canvasContext.createPattern(await createImageBitmap(renderedPixelsFine), "no-repeat")
  backgroundPatternAlpha = canvasContext.createPattern(await createImageBitmap(renderedPixelsFineAlpha), "no-repeat")
  //canvasPixelContext.putImageData(renderedPixelsFine, 0, 0)
}
let backgroundPattern: CanvasPattern|null = null
let backgroundPatternAlpha: CanvasPattern|null = null



enum AnimationState {
  AboveTop,
  Inside,
  BelowBottom,
}

let previousTime: number|null = null

let doneAnimatingCurtain = false
async function renderScene(state: AnimationState|null): Promise<AnimationState> {
  if (doneAnimatingCurtain) {
    return AnimationState.BelowBottom
  }

  log(gaussianObjects.positions.length)

  if (!(gaussianObjects.positions.length > 2)) return AnimationState.AboveTop

  let deltaTime: number
  if (state != AnimationState.Inside) {
    deltaTime = 1;
  } else {
    if (!previousTime) {
      previousTime = performance.now()
      deltaTime = 1
    } else {
      let currentTime = performance.now()
      deltaTime = (currentTime - previousTime) / 16
      previousTime = currentTime
    }
  }

  for (let index=0; index < gaussianObjects.positions.length; index++) {
    gaussianObjects.accelerations[index] += gaussianObjects.jolts[index] * deltaTime
    gaussianObjects.velocities[index] += gaussianObjects.accelerations[index] * deltaTime
    //friction
    gaussianObjects.velocities[index] *= 0.999
    gaussianObjects.positions[index] += gaussianObjects.velocities[index] * deltaTime

    positions[index] = gaussianObjects.positions[index]
  }

  //@ts-ignore
  let gaussianSmoothed = Smooth(gaussianObjects.positions)


  let index=0
  let eachIsAbove = true
  let eachIsBelow = true
  for (; index < gaussianObjects.positions.length*SMOOTHED_BOX_SIZE; index++) {
    let smoothedIndex = index/SMOOTHED_BOX_SIZE
    smoothedY[smoothedIndex] = gaussianSmoothed(smoothedIndex)
    if (smoothedY[smoothedIndex] >= -5 ) {
      eachIsAbove = false
    }
    if (smoothedY[smoothedIndex] <= clientHeightInitial + 5 ) {
      eachIsBelow = false
    }
  }

  if (eachIsAbove) {
    return AnimationState.AboveTop
  }
  if (eachIsBelow) {
    canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height)
    canvasContext.fillStyle = backgroundPattern ?? "black"
    canvasContext.fillRect(0, 0, canvasElement.width, canvasElement.height)
    playStateInternal = BackgroundState.AfterFirstPaused
    emit('curtainCall', '')
    doneAnimatingCurtain = true
    return AnimationState.BelowBottom
  }

  canvasContext.beginPath()
  index=0
  canvasContext.moveTo(index, smoothedY[0])
  index++
  for (; index < gaussianObjects.positions.length*SMOOTHED_BOX_SIZE; index++) {
    canvasContext.lineTo(index, smoothedY[index/SMOOTHED_BOX_SIZE]+16)
  }
  canvasContext.lineTo(clientWidthInitial, 0)
  canvasContext.lineTo(0, 0)
  canvasContext.closePath()

  canvasContext.fillStyle = backgroundPattern ?? "black"
  canvasContext.fill()

  return AnimationState.Inside
}

async function renderColumn(columnIndex: number) {
  let column = pixelColumnsFine[columnIndex]
  for (let boxIndex=0; boxIndex<column.length; boxIndex++) {
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
      position: { x: columnIndex-1, y: boxIndex-1},
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

  let positionalPercentage: number

  if (rainbow.dir == RainbowDirection.Regular) {
    positionalPercentage = (
      pixelData.position.x / canvasElement.width +
      pixelData.position.y / canvasElement.height
    ) * 0.5
  } else {
    positionalPercentage = (
      1 - pixelData.position.x / canvasElement.width +
      pixelData.position.y / canvasElement.height
    ) * 0.5
  }

  if (positionalPercentage < 0) positionalPercentage = 0
  if (positionalPercentage > 1) positionalPercentage = 1

  const lutIndex =
    Math.floor(positionalPercentage * (GRADIENT_LUT_SIZE - 1)) * 3

  const r = gradientLUT[lutIndex + 0]
  const g = gradientLUT[lutIndex + 1]
  const b = gradientLUT[lutIndex + 2]

  let i = left + top * widthInFinePixels
  i *= 4
  //@ts-expect-error
  renderedPixelsFine.data[i + 0] = r
  //@ts-expect-error
  renderedPixelsFineAlpha.data[i + 0] = r * BORDER_MULTI
  //@ts-expect-error
  renderedPixelsFine.data[i + 1] = g
  //@ts-expect-error
  renderedPixelsFineAlpha.data[i + 1] = g * BORDER_MULTI
  //@ts-expect-error
  renderedPixelsFine.data[i + 2] = b
  //@ts-expect-error
  renderedPixelsFineAlpha.data[i + 2] = b * BORDER_MULTI
  //@ts-expect-error
  renderedPixelsFine.data[i + 3] = 256
  //@ts-expect-error
  renderedPixelsFineAlpha.data[i + 3] = 32
}
const BORDER_MULTI = 1


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

const GRADIENT_LUT_SIZE = 2048
let gradientLUT = new Uint8ClampedArray(GRADIENT_LUT_SIZE * 3)

function buildGradientLUT() {
  log("buildGradientLUT")
  gradientLUT = new Uint8ClampedArray(GRADIENT_LUT_SIZE * 3)

  for (let i = 0; i < GRADIENT_LUT_SIZE; i++) {
    const percentage = i / (GRADIENT_LUT_SIZE - 1)

    const colorBase = gradientAtPercentage(percentage)

    const rgb = HSLToRGB(
      colorBase.hue,
      colorBase.saturation,
      colorBase.lightness
    )

    const idx = i * 3

    gradientLUT[idx + 0] = rgb[0]
    gradientLUT[idx + 1] = rgb[1]
    gradientLUT[idx + 2] = rgb[2]
  }
}

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
  const toreturn = colorBase.saturation/1.2 + offset
  if (toreturn < 1)
  console.log(`sat: ${toreturn}`)
  return toreturn
}
function jganttsLightness(offset: number, positionalPercentage: number, colorBase: Color): number {
  const toreturn = (colorBase.lightness + offset)// * positionalLightness
  return toreturn
}

function boxToHex(color: Color, alphaMultiplier: number) {
  return `hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, ${alphaMultiplier})`
}
function decToTwoDigitHex(dec: number) {
  let hexRaw = Math.floor(dec).toString(16)
  return (hexRaw.length==1) ? "0"+hexRaw : hexRaw
}



//#endregion

onMounted(async () => {
  if (!canvasRef.value) {
    throw new Error("Canvas element not found")
  }

  canvasElement = canvasRef.value
  canvasContext = canvasElement.getContext("2d")! 
})

onUnmounted(() => {
  window.removeEventListener("resize", throttledResizeHandler)
})

window.addEventListener("resize", throttledResizeHandler)


const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasHolderRef = ref<HTMLElement | null>(null)

let rainbow: Rainbow

let loadCurtainCalled = false
const loadCurtain = async (rainbowIn: Rainbow) => {
  if (loadCurtainCalled) return
  loadCurtainCalled = true
  rainbow = rainbowIn
  //await wait(100)
  initializeBackground()
}

const getCanvas = async (): Promise<HTMLCanvasElement> => {
  return canvasElement
}

const getDom = async (): Promise<HTMLElement> => {
  if (!canvasHolderRef.value) {
    throw new Error("Canvas holder not found")
  }

  return canvasHolderRef.value
}

let playStateInternal = BackgroundState.Unset
const pauseMutex = new Mutex()
const pausePlay = async (): Promise<BackgroundState> => {
  //@ts-expect-error
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
const play = async (): Promise<BackgroundState> => {
  //@ts-expect-error
  return await pauseMutex.runExclusive(() => {
    switch (playStateInternal) {
      case BackgroundState.First:
        return BackgroundState.First
      case BackgroundState.AfterFirstPlaying:
        return BackgroundState.AfterFirstPlaying
      case BackgroundState.Unset:
        // eslint-disable-next-line no-fallthrough
      case BackgroundState.AfterFirstPaused:
        playStateInternal = BackgroundState.AfterFirstPlaying
        doneAnimatingCurtain = false
        window.requestAnimationFrame(renderLoop)
        return BackgroundState.AfterFirstPlaying
    }
  })
}


const emit = defineEmits([
  'curtainCall',
  'stageEntrance',
]);
defineExpose({
  getCanvas,
  getDom,
  loadCurtain,
  pausePlay,
  play,
 })
 const props = defineProps({
  playState: {
    type: Number,
    default: BackgroundState.AfterFirstPaused
  }
 })
</script>

<template>
  <div id='canvas-holder' ref="canvasHolderRef">
    <canvas class="the-canvas" ref="canvasRef"/>
  </div>
</template>

<style scoped>
.the-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
