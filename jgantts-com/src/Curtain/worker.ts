import { gaussian } from './gaussian';

let widthInSuperPixels = 0
let heightInSuperPixels = 0

let widthInLargePixels = 0
let heightInLargePixels = 0

let widthInFinePixels = 0
let heightInFinePixels = 0

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

self.onmessage = async (event) => {
  const data = event.data;


  pixelColumnsSuper = []
  pixelColumnsLarge = []
  pixelColumnsFine = []

  widthInLargePixels = Math.ceil(data.width/PIXELATED_LARGE_BOX_SIZE) + 1
  heightInLargePixels = Math.ceil(data.height/PIXELATED_LARGE_BOX_SIZE) + 1
  widthInSuperPixels = widthInLargePixels*PIXELATION_RATIO_LARGE_SUPER
  heightInSuperPixels = heightInLargePixels*PIXELATION_RATIO_LARGE_SUPER
  widthInFinePixels = widthInLargePixels*PIXELATION_RATIO_LARGE_FINE
  heightInFinePixels = heightInLargePixels*PIXELATION_RATIO_LARGE_FINE

  let gaussianSumsPixelsSuper: number[] = gaussian(
    widthInSuperPixels,
    () => {return Math.random()*90 + 10},
    0, 1
  )
  let gaussianSumsPixelsLarge: number[] = gaussian(
    widthInLargePixels,
    () => {return Math.random()*90 + 10},
    0, 1
  )
  let gaussianSumsPixelsFine: number[] = gaussian(
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
  self.postMessage(
    {
      pixelColumnsSuper,
      pixelColumnsLarge,
      pixelColumnsFine,
      widthInLargePixels,
      heightInLargePixels,
      widthInSuperPixels,
      heightInSuperPixels,
      widthInFinePixels,
      heightInFinePixels,
    }
  );
};

type ColorOffset = {
  saturation: number, 
  lightness: number
}

let MULT_SUPER_SELF = 1
let MULT_SUPER_FAMILY = 10

let MULT_LARGE_TRANSDIM = 4
let MULT_LARGE_SELF = 1
let MULT_LARGE_FAMILY = 10

let MULT_PIXEL_TANSDIM = 4
let MULT_PIXEL_SELF = 1
let MULT_PIXEL_FAMILY = 20

let PIXELATED_FINE_BOX_SIZE = 1
let PIXELATED_LARGE_BOX_SIZE = 8
let PIXELATED_SUPER_BOX_SIZE = 64

let PIXELATION_RATIO_SUPER_LARGE = Math.floor(PIXELATED_SUPER_BOX_SIZE/PIXELATED_LARGE_BOX_SIZE)
let PIXELATION_RATIO_LARGE_FINE = Math.floor(PIXELATED_LARGE_BOX_SIZE/PIXELATED_FINE_BOX_SIZE)
let PIXELATION_RATIO_LARGE_SUPER = Math.ceil(PIXELATED_LARGE_BOX_SIZE/PIXELATED_LARGE_BOX_SIZE)

let TOP_BUFFER_PIXEL = 34

function base9Gradient(): ColorOffset {
  return {
    saturation: Math.random()*80 + 40,
    lightness: Math.random()*100 - 50,
    /*
    saturation: Math.random()*10 + 90,
    lightness: Math.random()*30 - 50,
    */
  }
}


let pixelColumnsSuper: ColorOffset[][] = []
let pixelColumnsLarge: ColorOffset[][] = []
let pixelColumnsFine: ColorOffset[][] = []

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
