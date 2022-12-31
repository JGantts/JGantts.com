<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

let BOX_SIZE = 32
let TOP_BUFFER = 4
let HORIZONTAL_BUFFERS = 4
let MAGIC_NUMBER_A = 5.5
let MAGIC_NUMBER_B = 1.5

/*
  Initialize variables
*/
let lastTimestamp = 0
let columns: {
  spawnIncrement: number,
  spawnCountdown: number,
  boxes: {
    position: { x: number, y: number },
    colorTL: { r: number, g: number, b: number},
    colorTR: { r: number, g: number, b: number},
    colorBR: { r: number, g: number, b: number},
    colorBL: { r: number, g: number, b: number},
  }[],
  doneAnimating: boolean,
}[] = []
let canvas: HTMLCanvasElement
let canvasContext: CanvasRenderingContext2D


/*
  Rendering functions
*/
async function resizedWindow() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

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
    let gaussianDists: number[][] = []
    for (let i=0; i < countToAdd + gaussianDistance*2; i++) {
      gaussianDists.push(gaussianDistribution(Math.random()*90 + 10))
    }
    let gaussianSums: number[] = []
    for (let i=gaussianDistance; i < countToAdd; i++) {
      let sum = 0
      for (let j=0; j < gaussianDistance*2; j++) {
        sum += gaussianDists[i-(j-gaussianDistance)][j]
      }

      let localizedToZero = sum/e-1
      let scaledToOne = localizedToZero*MAGIC_NUMBER_A
      let scaledToRange = (scaledToOne*gaussianRange/2) + gaussianMid
      let clamppedToRange = 
        scaledToRange > gaussianMax 
          ? gaussianMax
          : scaledToRange < gaussianMin
            ? gaussianMin
            : scaledToRange
      //if (clamppedToRange != scaledToRange) {
        //console.log(scaledToRange)
      //}
      gaussianSums.push(clamppedToRange)
    }

    /*
      Take the begining offsets and initialize the columns
    */
    for (let i=0; i < gaussianSums.length; i++) {
      columns.push({
        spawnIncrement: gaussianSums[i]*(spawnIncrementMax - spawnIncrementMin) + spawnIncrementMin,
        spawnCountdown: gaussianSums[i]*(spawnCountdownMax - spawnCountdownMin) + spawnCountdownMin,
        boxes: [],
        doneAnimating: false,
      })
    }
  }
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
    renderColumn(Number(key), interval)
  }
}

async function renderColumn(index: number, interval: number) {
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
  if(column.spawnCountdown < 0) {
    column.spawnCountdown += 1*intervalRatio
  } else {
    column.spawnCountdown += column.spawnIncrement*intervalRatio
  }
  if (column.spawnCountdown >= 1) {
    column.spawnCountdown -= 1

    /*
      Add new box
    */
    /* position */
    let position = { x: index, y: column.boxes.length }

    /* random color */
    let colorTL: { r: number, g: number, b: number }
    let colorTR: { r: number, g: number, b: number }
    let colorBR: { r: number, g: number, b: number }
    let colorBL: { r: number, g: number, b: number }

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
      colorTL = parent.colorBL
      colorTR = parent.colorBR
    } else {
      colorTL = randomBlue()
      colorTR = randomBlue()
    }
    if (leftCousin) {
      colorBL = leftCousin.colorBR
    } else {
      colorBL = randomBlue()
    }
    if (rightCousin) {
      colorBR = rightCousin.colorBL
    } else {
      colorBR = randomBlue()
    }

    let box = {
      position,
      colorTL,
      colorTR,
      colorBR,
      colorBL,
    }
    column.boxes.push(box)

    /*
      Render new box
    */
    renderBox(box)
  }
}

function renderBox(
  box: {
    position: { x: number, y: number },
    colorTL: { r: number, g: number, b: number},
    colorTR: { r: number, g: number, b: number},
    colorBR: { r: number, g: number, b: number},
    colorBL: { r: number, g: number, b: number},
}) {
  let left = (box.position.x - HORIZONTAL_BUFFERS)*BOX_SIZE
  let top = (box.position.y-TOP_BUFFER)*BOX_SIZE
  let right = left + BOX_SIZE
  let bottom = top + BOX_SIZE

  let gradientTLBR = canvasContext.createLinearGradient(left, top, right, bottom)
  gradientTLBR.addColorStop(0, rgbAToHex(box.colorTL, 1))
  gradientTLBR.addColorStop(1, rgbAToHex(box.colorBR, 1))
  canvasContext.fillStyle = gradientTLBR
  canvasContext.fillRect(left, top, BOX_SIZE, BOX_SIZE)

  let gradientBLTR = canvasContext.createLinearGradient(left, bottom, right, top)
  gradientBLTR.addColorStop(0, rgbAToHex(box.colorBL, 0.5))
  gradientBLTR.addColorStop(1, rgbAToHex(box.colorTR, 0.5))
  canvasContext.fillStyle = gradientBLTR
  canvasContext.fillRect(left, top, BOX_SIZE, BOX_SIZE)


/*
  let rect = 
    draw
      .rect(BOX_SIZE, BOX_SIZE)
      .move((position.x - HORIZONTAL_BUFFERS)*BOX_SIZE, (position.y-TOP_BUFFER)*BOX_SIZE)
      .attr({ fill: currentBackground })
  rect
    .animate(2000, 0, "last")
    .attr({ fill: rgbaToHex(color) })*/
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
    let fakeBackground = {
      r: 29,
      g: 65,
      b: 107,
    }
    color.r += fakeBackground.r
    color.r /= 2
    color.g += fakeBackground.g
    color.g /= 2
    color.b += fakeBackground.b
    color.b /= 2

    return color
}

function rgbAToHex(rgb: { r: number, g: number, b: number}, a: number) {
  return `#${decToTwoDigitHex(rgb.r)}${decToTwoDigitHex(rgb.g)}${decToTwoDigitHex(rgb.b)}${decToTwoDigitHex(a*255)}`
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
function gaussianDistribution(variance: number): number[] {
  let output: number[] = []
  for (let i = -gaussianDistance; i <= gaussianDistance; i++) {
    output.push(gaussianDistributionAt(variance, i))
  }
  return output
}

let e = 2.7182812690734863
function gaussianDistributionAt(variance: number, x: number): number {
    let sqrtTwoPiVariance: number = Math.sqrt(2*Math.PI*variance)
    let negativeXSquaredOver2Variance: number = 1-(x*x)/(2*variance)
    let output: number = (1/sqrtTwoPiVariance)*Math.pow(e, negativeXSquaredOver2Variance)
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
  canvas = document.getElementById('animation-base') as HTMLCanvasElement
  canvasContext = canvas.getContext("2d")!
  await resizedWindow()
  //await new Promise(resolve => setTimeout(resolve, 400))
  lastTimestamp = Date.now()
  window.requestAnimationFrame(renderLoop)
})

onUnmounted(() => {
  window.removeEventListener("resize", resizedWindow)
})

window.addEventListener("resize", resizedWindow)
</script>

<template>
  <canvas id="animation-base" width="100" height="100"/>
</template>

<style scoped>
#animation-base {
  position: absolute;
  left: 0;
  top: -0;
  width: 100vw;
  height: 100vh;
  overflow: clip;
}
</style>
