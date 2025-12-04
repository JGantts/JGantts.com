<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Mutex } from 'async-mutex';


// @ts-ignore
import{ Smooth } from '../assets/Smooth'

import type { Color, Rainbow } from './Types';
import { BackgroundState, RainbowDirection } from './Types';

import { gaussians } from './gausians';

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

type GaussianObject = {
  position: number,
  velocity: number,
  acceleration: number,
  jolt: number,
}

/*
  Initialize variables
*/

let gaussianObjects: GaussianObject[]

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


let pixelColumnsSuper: {saturation: number, lightness: number}[][] = []
let pixelColumnsLarge: {saturation: number, lightness: number}[][] = []
let pixelColumnsFine: {saturation: number, lightness: number}[][] = []

/*
  Rendering functions
*/
async function initializeBackground() {
  const width = window.visualViewport?.width || canvasElement.clientWidth
  const height = window.visualViewport?.height || canvasElement.clientHeight

  doneAnimatingCurtain = false

  const ratio = window.devicePixelRatio || 1;
  if (canvasElement.width != width) {
    canvasElement.width = width * ratio;
    canvasElement.height = height * ratio;
    //canvasContext.scale(ratio, ratio);
  }
  
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

  let messageQueue: MessageEvent[] = [];
  let processingAllowed: boolean = false;
  let queueLock: Mutex = new Mutex()

  async function handleWorkerMessage(event: MessageEvent) {
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
  doneAnimatingCurtain = false
  const ratio = window.devicePixelRatio || 1;
  let countToAddSmoothed = ratio*widthInLargePixels*PIXELATED_LARGE_BOX_SIZE/SMOOTHED_BOX_SIZE

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

  const width = window.visualViewport?.width || canvasElement.clientWidth
  const height = window.visualViewport?.height || canvasElement.clientHeight

  if (clientWidthInitial != width) {
    clientWidthInitial = width * ratio
    clientHeightInitial = height * ratio
  }
}

let clientWidthInitial = 0
let clientHeightInitial = 0

let state: AnimationState|null = null
async function renderLoop() {
  await pauseMutex.runExclusive(async () => {
    if (playStateInternal == BackgroundState.AfterFirstPaused) {
      return
    }
    do {
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

  for (let index=0; index < gaussianObjects.length; index++) {
    gaussianObjects[index].acceleration += gaussianObjects[index].jolt * deltaTime
    gaussianObjects[index].velocity += gaussianObjects[index].acceleration * deltaTime
    //friction
    gaussianObjects[index].velocity *= 0.999
    gaussianObjects[index].position += gaussianObjects[index].velocity * deltaTime
  }

  //@ts-ignore
  let gaussionSmoothed = Smooth(gaussianObjects.map(objct => objct.position))

  let smoothedY: number[] = []

  let index=0
  let eachIsAbove = true
  let eachIsBelow = true
  for (; index < gaussianObjects.length*SMOOTHED_BOX_SIZE; index++) {
    let smoothedIndex = index/SMOOTHED_BOX_SIZE
    smoothedY[smoothedIndex] = gaussionSmoothed(smoothedIndex)
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
    playStateInternal = BackgroundState.AfterFirstPaused
    emit('curtainCall', '')
    doneAnimatingCurtain = true
    return AnimationState.BelowBottom
  }

  canvasContext.beginPath()
  index=0
  canvasContext.moveTo(index, smoothedY[0])
  index++
  for (; index < gaussianObjects.length*SMOOTHED_BOX_SIZE; index++) {
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
  renderedPixelsFineAlpha.data[i + 0] = rgb[0] * BORDER_MULTI
  //@ts-expect-error
  renderedPixelsFine.data[i + 1] = rgb[1]
  //@ts-expect-error
  renderedPixelsFineAlpha.data[i + 1] = rgb[1] * BORDER_MULTI
  //@ts-expect-error
  renderedPixelsFine.data[i + 2] = rgb[2]
  //@ts-expect-error
  renderedPixelsFineAlpha.data[i + 2] = rgb[2] * BORDER_MULTI
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
  if (toreturn < 1)
  console.log(`light: ${toreturn}`)
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
  //@ts-expect-error
  canvasElement = canvasRef.value
  canvasContext = canvasElement.getContext("2d")! 
})

onUnmounted(() => {
  window.removeEventListener("resize", throttledResizeHandler)
})

window.addEventListener("resize", throttledResizeHandler)
window.visualViewport?.addEventListener("resize", throttledResizeHandler)


const canvasRef = ref(null)

let rainbow: Rainbow

const loadCurtain = async (rainbowIn: Rainbow) => {
  rainbow = rainbowIn
  //await wait(100)
  initializeBackground()
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
  <div id='canvas-holder'>
    <canvas class="the-canvas" ref="canvasRef"/>
  </div>
</template>

<style scoped>
.the-canvas {
  position: absolute;
  left: -25px;
  top: -25px;
  width: calc(100% + 50px);
  height: calc(100% + 50px);
  clip-path: inset(0);
}
</style>