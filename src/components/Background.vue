<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
// @ts-ignore
import{ Smooth } from '../assets/Smooth'
import {
  sky,
  skyDark,
  orange,
  orangeDark,
  slate,
  slateDark,
} from '@radix-ui/colors';

let BOX_SIZE = 8
let TOP_BUFFER = 34
let HORIZONTAL_BUFFERS = 4
let MAGIC_NUMBER_A = 5.5
let MAGIC_NUMBER_B = 1.5
let MAGIC_NUMBER_C = 4
let MAGIC_NUMBER_D = 0.47
let MAGIC_NUMBER_E = 1.6
let MAGIC_NUMBER_F = 285 + 30

type Position = {
  x: number,
  y: number 
}

type Color = { 
  hue: number, 
  saturation: number, 
  lightness: number
}

type Box = {
    color: Color,
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
let lastTimestamp = 0
let columns: {
  boxes: Box[],
}[] = []
let canvasPixelElement: HTMLCanvasElement
let canvasPixelContext: CanvasRenderingContext2D
let canvasSmoothElement: HTMLCanvasElement
let canvasSmoothContext: CanvasRenderingContext2D
let gaussianObjects: GaussianObject[]


let needsRedraw = false

/*
  Rendering functions
*/
async function resizedWindow() {
  canvasPixelElement.width = canvasPixelElement.clientWidth;
  canvasPixelElement.height = canvasPixelElement.clientHeight;
  canvasSmoothElement.width = canvasSmoothElement.clientWidth;
  canvasSmoothElement.height = canvasSmoothElement.clientHeight;

  /*
    Check if (and how many) new columns to add
  */
  let newWidthRaw = (window.outerWidth/BOX_SIZE)*MAGIC_NUMBER_B
  let newWidthPerSideRaw = newWidthRaw
  let newPixelsPerSide = Math.ceil(newWidthPerSideRaw) + 1 + HORIZONTAL_BUFFERS*2
  let oldPixelsPerSide = columns.length
  let countToAdd = newPixelsPerSide - oldPixelsPerSide

  if (countToAdd === 0) {
    return

  } else if(countToAdd < 0) {
    //Subtract columns
      //or not

  } else if(countToAdd > 0) {
    //Add columns

    /*
      Calculate the random begining offsets (for the nice-looking gaussian wave "falling curtain" effect)
    */
    //background pattern

    let gaussianSumsBackground: number[] = gaussians(countToAdd, () => {return Math.random()*90 + 10},  0, 1)
    let gaussianSumsPosition: number[] = gaussians(countToAdd, () => {return Math.random()*90 + 10},  0, 1)
    let gaussianSumsVelocity: number[] = gaussians(countToAdd, () => {return Math.random()*90 + 10},  0, 1)
    let gaussianSumsAcceleration: number[] = gaussians(countToAdd, () => {return Math.random()*90 + 10},  0.5, 1)
    let gaussianSumsJolt: number[] = gaussians(countToAdd, () => {return Math.random()*90 + 10}, 0, 0.5)



    /*
      Take the begining offsets and initialize the columns
    */
    for (let i=0; i < gaussianSumsBackground.length; i++) {
      columns.push({
        boxes: new Array(Math.floor(gaussianSumsBackground[i]*30)).fill({ color: randomBlue() }),
      })
    }
    gaussianObjects = []
    for (let index=gaussianDistance; index < countToAdd-gaussianDistance; index++) {
      gaussianObjects.push({
          position: gaussianSumsPosition[index] - 1 + -1*(Math.abs(index-canvasPixelElement.width*3/100))/10,
          velocity: gaussianSumsVelocity[index]/1000,
          acceleration: gaussianSumsAcceleration[index]/10000,
          jolt: gaussianSumsJolt[index]*-1/10000000,
        })
    }
    paintScene()
  }

  needsRedraw = true
}

async function renderLoop() {
  let thisTimestamp = Date.now()
  await renderScene(20)
  lastTimestamp = thisTimestamp
  //Attempt force framerate
  //await new Promise(resolve => setTimeout(resolve, 50))
  window.requestAnimationFrame(renderLoop)
}

async function paintScene() {
  //console.log("wut")
  while ((columns[0].boxes.length-TOP_BUFFER*2)*BOX_SIZE < window.outerHeight) {
    for (let key in columns) {
      calculateColumn(Number(key))
    }
    for (let key in columns) {
      renderColumn(Number(key))
    }
  }
  needsRedraw = false
}

async function renderScene(interval: number) {
  calculateRenderClip(interval)
}

async function calculateColumn(index: number) { 
  let column = columns[index]

  /*
    Add new box
  */
  /* position */
  let position = { x: index, y: column.boxes.length }

  /* random color */
  let color = randomBlue()

  /* smooth out color with existing neighbors */
  let parent = null
  let leftCousin = null
  let rightCousin = null

  parent = column.boxes[column.boxes.length-1]
  let leftLineage = columns[index - 1]
  if (leftLineage) {
    leftCousin = leftLineage.boxes[column.boxes.length - 1]
  }
  let rightLineage = columns[index + 1]
  if (rightLineage) {
    rightCousin = rightLineage.boxes[column.boxes.length - 1]
  }
  let colorToTint = {
    r: 0,
    g: 0,
    b: 0,
    a: 0
  }
  let colorsAdded = 0
  if (parent) {
    colorToTint.r += parent.color.hue
    colorToTint.g += parent.color.saturation
    colorToTint.b += parent.color.lightness
    colorsAdded += 1
  }
  if (leftCousin) {
    colorToTint.r += leftCousin.color.hue
    colorToTint.g += leftCousin.color.saturation
    colorToTint.b += leftCousin.color.lightness
    colorsAdded += 1
  }
  if (rightCousin) {
    colorToTint.r += rightCousin.color.hue
    colorToTint.g += rightCousin.color.saturation
    colorToTint.b += rightCousin.color.lightness
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

  column.boxes.push({
    color: color
  })
}

//let offsetY = -MAGIC_NUMBER_F
let doneAnimatingCurtain = false
async function calculateRenderClip(interval: number) {
  if (doneAnimatingCurtain) {
    return
  }
  //offsetY += MAGIC_NUMBER_E

  let eachIsDone = true
  for (let index=0; index < gaussianObjects.length; index++) {
    gaussianObjects[index].acceleration += gaussianObjects[index].jolt
    gaussianObjects[index].velocity += gaussianObjects[index].acceleration
    //friction
    gaussianObjects[index].velocity *= 0.999
    gaussianObjects[index].position += gaussianObjects[index].velocity
    if (gaussianObjects[index].position*500*MAGIC_NUMBER_D < canvasPixelElement.height ) {
      eachIsDone = false
    }
  }
  if (eachIsDone) {
    doneAnimatingCurtain = true
    return
  }

  //@ts-ignore
  let gaussionSmoothed = Smooth(gaussianObjects.map(objct => objct.position))
  /*if (doneAnimatingCurtain || offsetY > canvasSmoothElement.height*1.5) {
    doneAnimatingCurtain = true
    return
  }*/



  let offsetX = canvasSmoothElement.clientWidth

  canvasSmoothContext.clearRect(0, 0, canvasSmoothElement.width, canvasSmoothElement.height);
  canvasSmoothContext.save()
  canvasSmoothContext.beginPath()
  canvasSmoothContext.moveTo(canvasSmoothElement.clientWidth*0, canvasSmoothElement.clientHeight*0)
  canvasSmoothContext.lineTo(canvasSmoothElement.clientWidth*offsetX+1, canvasSmoothElement.clientHeight*0)
  canvasSmoothContext.lineTo(canvasSmoothElement.clientWidth*offsetX+1, canvasSmoothElement.clientHeight*1)
  canvasSmoothContext.lineTo(canvasSmoothElement.clientWidth*0, canvasSmoothElement.clientHeight*1)
  canvasSmoothContext.closePath()
  canvasSmoothContext.clip()

  canvasSmoothContext.beginPath()
  let index=0
  canvasSmoothContext.moveTo(index-BOX_SIZE*MAGIC_NUMBER_C, gaussionSmoothed(index))
  index++
  for (; index < gaussianObjects.length*highresScale; index++) {
    canvasSmoothContext.lineTo(index-BOX_SIZE*MAGIC_NUMBER_C, gaussionSmoothed(index/highresScale)*500*MAGIC_NUMBER_D)
  }
  canvasSmoothContext.lineTo(canvasSmoothElement.clientWidth, canvasSmoothElement.clientHeight)
  canvasSmoothContext.lineTo(0, canvasSmoothElement.clientHeight)
  canvasSmoothContext.closePath()

  canvasSmoothContext.fillStyle = (darkModePreference.matches ? skyDark : sky).sky3
  canvasSmoothContext.fill()
  canvasSmoothContext.restore()
}

async function renderColumn(columnIndex: number) {
  let column = columns[columnIndex]
  if (needsRedraw) {
    for (let boxIndex=0; boxIndex<column.boxes.length; boxIndex++) {
      tryRenderBox(columnIndex, boxIndex)
    }
  } else {
    for (let boxIndex=column.boxes.length; boxIndex>=0; boxIndex--) {
      if(tryRenderBox(columnIndex, boxIndex)) {
        break
      }
    }
  }
}

function tryRenderBox(columnIndex: number, boxIndex: number): boolean {
    let column = columns[columnIndex]
    let leftCousin = null
    let leftLineage = columns[columnIndex - 1]
    if (leftLineage == null) {
      return false
    }
    leftCousin = leftLineage.boxes[boxIndex]
    let parent = column.boxes[boxIndex-1]
    let leftAunt = leftLineage.boxes[boxIndex - 1]
    if (leftCousin == null || leftAunt == null || parent == null) {
      return false
    }
    let me = column.boxes[boxIndex]
    if (me == null) {
      return false
    }
    renderGradient({
      position: { x: columnIndex-1, y: boxIndex-1},
      boxTL: leftAunt,
      boxTR: parent,
      boxBR: me,
      boxBL: leftCousin,
    })
    return true
}

function renderGradient(
  gradientData: {
    position: Position,
    boxTL: Box,
    boxTR: Box,
    boxBR: Box,
    boxBL: Box
}) {
  let left = (gradientData.position.x - HORIZONTAL_BUFFERS)*BOX_SIZE
  let top = (gradientData.position.y-TOP_BUFFER)*BOX_SIZE
  let right = left + BOX_SIZE
  let bottom = top + BOX_SIZE

  canvasPixelContext.fillStyle = (darkModePreference.matches ? skyDark : sky).sky9
  canvasPixelContext.fillRect(left, top, BOX_SIZE, BOX_SIZE)

  let gradientTLBR = canvasPixelContext.createLinearGradient(left, top, right, bottom)
  gradientTLBR.addColorStop(0, boxToHex(gradientData.boxTL, 1))
  gradientTLBR.addColorStop(1, boxToHex(gradientData.boxBR, 1))
  canvasPixelContext.fillStyle = gradientTLBR
  canvasPixelContext.fillRect(left, top, BOX_SIZE, BOX_SIZE)

  let gradientBLTR = canvasPixelContext.createLinearGradient(left, bottom, right, top)
  gradientBLTR.addColorStop(0, boxToHex(gradientData.boxBL, 0.5))
  gradientBLTR.addColorStop(1, boxToHex(gradientData.boxTR, 0.5))
  canvasPixelContext.fillStyle = gradientBLTR
  canvasPixelContext.fillRect(left, top, BOX_SIZE, BOX_SIZE)
}


/*
  Helper functions
*/
function randomBlue(): Color {
  let basePrimary = sky.sky9
  let splitA = basePrimary.split(',')
  let hue = splitA[0].split('(')[1]
  let saturation = splitA[1].split('%')[0]
  let lightness = splitA[2].split('%')[0]
  let color = {
    hue: Number(hue) + Math.random()*80 - 40,
    saturation: Number(saturation) + Math.random()*80 - 40,
    lightness: Number(lightness) + Math.random()*100 - 50,
  }
  return color
}

function boxToHex(box: Box, alphaMultiplier: number) {
  return `hsla(${box.color.hue}, ${box.color.saturation}%, ${box.color.lightness}%, ${alphaMultiplier})`
}
function decToTwoDigitHex(dec: number) {
  let hexRaw = Math.floor(dec).toString(16)
  return (hexRaw.length==1) ? "0"+hexRaw : hexRaw
}

let spawnIncrementMin = 1
let spawnIncrementMax = 1
let spawnCountdownMin = -30
let spawnCountdownMax = 0

let gaussianDistance = 20


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
  for (let i=distance; i < length; i++) {
    let sum = 0
    for (let j=0; j < distance*2; j++) {
      sum += dists[i-(j-distance)][j]
    }

    gaussianSums.push(noramalizer(sum))
  }
  return gaussianSums
}

let highresScale = BOX_SIZE
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
  canvasPixelElement = document.getElementById('lowres-canvas') as HTMLCanvasElement
  canvasPixelContext = canvasPixelElement.getContext("2d")!
  canvasSmoothElement = document.getElementById('highres-canvas') as HTMLCanvasElement
  canvasSmoothContext = canvasSmoothElement.getContext("2d")!
  
  await resizedWindow()
  //await new Promise(resolve => setTimeout(resolve, 400))
  lastTimestamp = Date.now()
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
