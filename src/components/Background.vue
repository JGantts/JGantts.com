<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
// @ts-ignore
import{ Smooth } from '../assets/Smooth'

let BOX_SIZE = 8
let TOP_BUFFER = 4
let HORIZONTAL_BUFFERS = 4
let MAGIC_NUMBER_A = 5.5
let MAGIC_NUMBER_B = 1.5
let MAGIC_NUMBER_C = 3.5

type Position = {
  x: number,
  y: number 
}

type Color = { 
  r: number, 
  g: number, 
  b: number
}

type Box = {
    position: Position,
    color: Color,
  }

/*
  Initialize variables
*/
let lastTimestamp = 0
let columns: {
  spawnIncrement: number,
  spawnCountdown: number,
  boxes: Box[],
  doneAnimating: boolean,
}[] = []
let canvas1Element: HTMLCanvasElement
let canvas1Context: CanvasRenderingContext2D
let canvas2Element: HTMLCanvasElement
let canvas2Context: CanvasRenderingContext2D
let gaussianLowres: number[] = []
let gaussionSmoothed: any = null


let needsRedraw = false

/*
  Rendering functions
*/
async function resizedWindow() {
  canvas1Element.width = canvas1Element.clientWidth;
  canvas1Element.height = canvas1Element.clientHeight;
  canvas2Element.width = canvas2Element.clientWidth;
  canvas2Element.height = canvas2Element.clientHeight;

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
    let gaussianDists: { lowres: number[], highres: number[] }[] = []
    for (let i=0; i < countToAdd + gaussianDistance*2; i++) {
      gaussianDists.push(gaussianDistribution(Math.random()*90 + 10))
    }
    let lowresDists = gaussianDists.map(dist => dist.lowres)
    let highresDists = gaussianDists.map(dist => dist.highres)
    let highresDistsWithFiller: number[][] = []
    for(let ii=0; ii<highresDists.length*highresScale; ii++) {
      if (Math.floor(ii/highresScale) == ii/highresScale) {
        highresDistsWithFiller[ii] = highresDists[ii/highresScale]
      } else {
        highresDistsWithFiller[ii] = new Array(gaussianDistance*highresScale*2).fill(0)
      }
    }
    let gaussianResults: { lowres: number[], highres: number[] } = {
      lowres: gaussianSums(lowresDists, countToAdd, gaussianDistance, sum => {
        let localizedToZero = sum/e-1
        let scaledToOne = localizedToZero*MAGIC_NUMBER_A
        let scaledToRange = (scaledToOne*gaussianRange/2) + gaussianMid
        let clamppedToRange = 
          scaledToRange > gaussianMax 
            ? gaussianMax
            : scaledToRange < gaussianMin
              ? gaussianMin
              : scaledToRange
        return clamppedToRange
      }),
      highres: gaussianSums(highresDistsWithFiller, countToAdd*highresScale, gaussianDistance*highresScale, sum => {
        let scaledOne = sum-2
        let scaledTwo = scaledOne*400
        return scaledTwo
      })
    }
    

    /*
      Take the begining offsets and initialize the columns
    */
    for (let i=0; i < gaussianResults.lowres.length; i++) {
      columns.push({
        spawnIncrement: gaussianResults.lowres[i]*(spawnIncrementMax - spawnIncrementMin) + spawnIncrementMin,
        spawnCountdown: gaussianResults.lowres[i]*(spawnCountdownMax - spawnCountdownMin) + spawnCountdownMin,
        boxes: [],
        doneAnimating: false,
      })
    }
    gaussianLowres = gaussianResults.lowres
    //@ts-ignore
    gaussionSmoothed = Smooth(gaussianResults.lowres)
  }

  needsRedraw = true
}

async function renderLoop() {
  let thisTimestamp = Date.now()
  await renderScene(thisTimestamp - lastTimestamp)
  lastTimestamp = thisTimestamp
  //Attempt force framerate
  //await new Promise(resolve => setTimeout(resolve, 50))
  window.requestAnimationFrame(renderLoop)
}

async function renderScene(interval: number) {
  //console.log("wut")
  for (let key in columns) {
    calculateColumn(Number(key), interval)
  }
  calculateRenderClip(interval)
  for (let key in columns) {
    renderColumn(Number(key))
  }
  needsRedraw = false
}

async function calculateColumn(index: number, interval: number) { 
  let column = columns[index]

  /*
    Are we done filling out this column?
  */
  if (column.doneAnimating || (column.boxes.length-TOP_BUFFER)*BOX_SIZE > window.outerHeight) {
    column.doneAnimating = true
    return
  }

  /*
    Are we ready for the new box? (techincaly dead code atm, was used to make some columns faster than others)
  */
  let intervalRatio = interval/100
  column.spawnCountdown += column.spawnIncrement*intervalRatio
  if (column.spawnCountdown >= 1) {
    column.spawnCountdown -= 1

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
      colorToTint.r += parent.color.r
      colorToTint.g += parent.color.g
      colorToTint.b += parent.color.b
      colorsAdded += 1
    }
    if (leftCousin) {
      colorToTint.r += leftCousin.color.r
      colorToTint.g += leftCousin.color.g
      colorToTint.b += leftCousin.color.b
      colorsAdded += 1
    }
    if (rightCousin) {
      colorToTint.r += rightCousin.color.r
      colorToTint.g += rightCousin.color.g
      colorToTint.b += rightCousin.color.b
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
        randomMultiplier * color.r
        + consistentMultiplier * colorToTint.r
      let green =
        randomMultiplier * color.g
        + consistentMultiplier * colorToTint.g
      let blue =
        randomMultiplier * color.b
        + consistentMultiplier * colorToTint.b

      red = Math.floor(red/multiplierSum)
      green = Math.floor(green/multiplierSum)
      blue = Math.floor(blue/multiplierSum)

      color.r = red
      color.g = green
      color.b = blue
    }

    column.boxes.push({
      position: position,
      color: color
    })
  }
}

let offsetY = -200
let doneAnimatingCurtain = false
async function calculateRenderClip(interval: number) {
  if (doneAnimatingCurtain || offsetY > canvas2Element.height*1.5) {
    doneAnimatingCurtain = true
    return
  }
  offsetY += interval/20
  canvas2Context.clearRect(0, 0, canvas2Element.width, canvas2Element.height);
  canvas2Context.fillStyle = currentBackground
  canvas2Context.beginPath()
  let index=0
  canvas2Context.moveTo(index-BOX_SIZE*MAGIC_NUMBER_C, gaussionSmoothed(index)+offsetY)
  index++
  for (; index < gaussianLowres.length*highresScale; index++) {
    canvas2Context.lineTo(index-BOX_SIZE*MAGIC_NUMBER_C, gaussionSmoothed(index/highresScale)*500+offsetY)
  }
  canvas2Context.lineTo(canvas2Element.clientWidth, canvas2Element.clientHeight)
  canvas2Context.lineTo(0, canvas2Element.clientHeight)
  canvas2Context.closePath()

  canvas2Context.fillStyle = currentBackground
  canvas2Context.fill()
}

async function renderColumn(columnIndex: number) {
  let column = columns[columnIndex]
  if (column.doneAnimating && !needsRedraw) {
    return
  }
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

  canvas1Context.fillStyle = currentBackground
  canvas1Context.fillRect(left, top, BOX_SIZE, BOX_SIZE)

  let gradientTLBR = canvas1Context.createLinearGradient(left, top, right, bottom)
  gradientTLBR.addColorStop(0, boxToHex(gradientData.boxTL, 1))
  gradientTLBR.addColorStop(1, boxToHex(gradientData.boxBR, 1))
  canvas1Context.fillStyle = gradientTLBR
  canvas1Context.fillRect(left, top, BOX_SIZE, BOX_SIZE)

  let gradientBLTR = canvas1Context.createLinearGradient(left, bottom, right, top)
  gradientBLTR.addColorStop(0, boxToHex(gradientData.boxBL, 0.5))
  gradientBLTR.addColorStop(1, boxToHex(gradientData.boxTR, 0.5))
  canvas1Context.fillStyle = gradientBLTR
  canvas1Context.fillRect(left, top, BOX_SIZE, BOX_SIZE)
}


/*
  Helper functions
*/
function randomBlue(): { r: number, g: number, b: number} {
  let color = {
    r: Math.random()*50 + 0,
    g: Math.random()*255 + 0,
    b: Math.random()*50 + 200,
  }
  /*let fakeBackground = {
    r: 29,
    g: 65,
    b: 107,
  }
  color.r += fakeBackground.r
  color.r /= 2
  color.g += fakeBackground.g
  color.g /= 2
  color.b += fakeBackground.b
  color.b /= 2*/

  return color
}

function boxToHex(box: Box, alphaMultiplier: number) {
  return `#${decToTwoDigitHex(box.color.r)}${decToTwoDigitHex(box.color.g)}${decToTwoDigitHex(box.color.b)}${decToTwoDigitHex(255*alphaMultiplier)}`
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
let gaussianMin = 0
let gaussianMax = 1
let gaussianRange = gaussianMax - gaussianMin
let gaussianMid = (gaussianMax + gaussianMin)/2

function gaussianSums(dists: number[][], length: number, distance: number, noramalizer: (x: number) => number): number[] {
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
function gaussianDistribution(variance: number): { lowres: number[], highres: number[] } {
  let lowres: number[] = []
  let highres: number[] = []
  let oneOverSqrtTwoPiVariance: number = 1/Math.sqrt(2*Math.PI*variance)
  for (let i = -gaussianDistance; i <= gaussianDistance; i++) {
    lowres.push(gaussianDistributionAt(variance, oneOverSqrtTwoPiVariance, i))
  }
  for (let i = -gaussianDistance*highresScale; i <= gaussianDistance*highresScale; i++) {
    highres.push(gaussianDistributionAt(variance, oneOverSqrtTwoPiVariance, i/highresScale))
  }
  return { lowres, highres }
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
//Set and check for dark mode
let LIGHT_BACKGROUND = `#EFEFEF`
let DARK_BACKGROUND = `#1F1F1F`

let currentBackground = window.matchMedia("(prefers-color-scheme: dark)").matches ? DARK_BACKGROUND : LIGHT_BACKGROUND

const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)")
darkModePreference.addEventListener("change", e => {
  if (e.matches){
    currentBackground = DARK_BACKGROUND
  } else {
    currentBackground = LIGHT_BACKGROUND
  }
})

/*
  And begin!
*/

onMounted(async () => {
  console.log("Hello, world!")
  canvas1Element = document.getElementById('lowres-canvas') as HTMLCanvasElement
  canvas1Context = canvas1Element.getContext("2d")!
  canvas2Element = document.getElementById('highres-canvas') as HTMLCanvasElement
  canvas2Context = canvas2Element.getContext("2d")!
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
    style= 'position: absolute; z-index: 1'
    >NOOOOO!</canvas>
    <canvas
    id='highres-canvas'
    style= 'position: absolute; z-index: 2'
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
  opacity: 75%;
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
