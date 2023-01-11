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
  green,
  greenDark,
  sky,
  skyDark,
  orange,
  orangeDark,
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
}

let themeSkyDark_Orange: Theme = {
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

let themeGrassDark_Tomato: Theme = {
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

let themeAmberDark_Violet: Theme = {
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

let themeCrimsonDark_Green: Theme = {
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

let theme = themeSkyDark_Orange
//let theme = themeGrassDark_Tomato
//let theme = themeAmberDark_Violet
//let theme = themeCrimsonDark_Green

let PIXELATED_BOX_SIZE = 8
let SMOOTHED_BOX_SIZE = 8
let TOP_BUFFER = 34

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

  let countToAddPixelated = Math.ceil(canvasPixelElement.width/PIXELATED_BOX_SIZE) + 1

  if(countToAddPixelated > 0) {
    let countToAddSmoothed = countToAddPixelated*PIXELATED_BOX_SIZE/SMOOTHED_BOX_SIZE

    let gaussianSumsBackground: number[] = gaussians(
      countToAddPixelated,
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
    for (let i=0; i < countToAddPixelated; i++) {
      columns.push({
        boxes: new Array(Math.floor(gaussianSumsBackground[i]*30)).fill({ color: randomBlue() }),
      })
    }
    gaussianObjects = []
    for (let index=0; index < countToAddSmoothed; index++) {
      gaussianObjects.push({
          position: gaussianSumsPosition[index] - 500*(Math.abs(index-0.15*countToAddSmoothed))/countToAddSmoothed,
          velocity: gaussianSumsVelocity[index],
          acceleration: gaussianSumsAcceleration[index],
          jolt: gaussianSumsJolt[index],
        })
    }
    paintScene()
  }

  needsRedraw = true
}

async function renderLoop() {
  let thisTimestamp = Date.now()
  let done = await renderScene()
  lastTimestamp = thisTimestamp
  if (!done) {
    window.requestAnimationFrame(renderLoop)
  }
}

async function paintScene() {
  while ((columns[0].boxes.length-TOP_BUFFER*2)*PIXELATED_BOX_SIZE < window.outerHeight) {
    for (let key in columns) {
      calculateColumn(Number(key))
    }
    for (let key in columns) {
      renderColumn(Number(key))
    }
  }
  needsRedraw = false
}

async function calculateColumn(index: number) { 
  let column = columns[index]

  /*
    Add new box
  */

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
    if (gaussianObjects[index].position < canvasPixelElement.height + TOP_BUFFER ) {
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
  let left = (gradientData.position.x)*PIXELATED_BOX_SIZE
  let top = (gradientData.position.y-TOP_BUFFER)*PIXELATED_BOX_SIZE
  let right = left + PIXELATED_BOX_SIZE
  let bottom = top + PIXELATED_BOX_SIZE

  canvasPixelContext.clearRect(left, top, PIXELATED_BOX_SIZE, PIXELATED_BOX_SIZE)

  let gradientTLBR = canvasPixelContext.createLinearGradient(left, top, right, bottom)
  gradientTLBR.addColorStop(0, boxToHex(gradientData.boxTL, 1))
  gradientTLBR.addColorStop(1, boxToHex(gradientData.boxBR, 1))
  canvasPixelContext.fillStyle = gradientTLBR
  canvasPixelContext.fillRect(left, top, PIXELATED_BOX_SIZE, PIXELATED_BOX_SIZE)

  let gradientBLTR = canvasPixelContext.createLinearGradient(left, bottom, right, top)
  gradientBLTR.addColorStop(0, boxToHex(gradientData.boxBL, 0.5))
  gradientBLTR.addColorStop(1, boxToHex(gradientData.boxTR, 0.5))
  canvasPixelContext.fillStyle = gradientBLTR
  canvasPixelContext.fillRect(left, top, PIXELATED_BOX_SIZE, PIXELATED_BOX_SIZE)
}


/*
  Helper functions
*/
function randomBlue(): Color {
  let basePrimary = theme.base9
  let color = {
    hue: basePrimary.hue + Math.random()*80 - 40,
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

function boxToHex(box: Box, alphaMultiplier: number) {
  return `hsla(${box.color.hue}, ${box.color.saturation}%, ${box.color.lightness}%, ${alphaMultiplier})`
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
