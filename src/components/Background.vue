<script lang="ts">
import { SVG, extend as SVGextend, Element as SVGElement } from '@svgdotjs/svg.js'


let boxSize = 6;
let topBuffer = 4;

let lastTimestamp = 0;

let MAGIC_NUMBER_B = 1.5

export default {
  data(): { 
    topRowBoxes: {
      spawnIncrement: number,
      spawnCountdown: number,
      boxes: {
        position: { x: number, y: number },
        color: { r: number, g: number, b: number},
      }[],
      doneAnimating: boolean,
    }[],
    draw: any
  } {
    return {
      topRowBoxes: [],
      draw: null,
    };
  },

  methods: {
    async resizedWindow() {
      let newWidthRaw = (window.outerWidth/boxSize)*MAGIC_NUMBER_B;
      let newWidthPerSideRaw = newWidthRaw;
      let newPixelsPerSide = Math.ceil(newWidthPerSideRaw) + 1;
      let oldPixelsPerSide = this.topRowBoxes.length;
      let countToAdd = newPixelsPerSide - oldPixelsPerSide;

      if (countToAdd === 0) {
        return;

      } else if(countToAdd < 0) {
        //Subtract boxes
        /*let countToDelete = Math.abs(countToAdd);
        this.topRowBoxes.left.splice(this.topRowBoxes.left.length - countToDelete, countToDelete);
        this.topRowBoxes.right.splice(this.topRowBoxes.left.length - countToDelete, countToDelete);*/

      } else if(countToAdd > 0) {
        //Add boxes
        let gaussianDists: number[][] = [];
        for (let i=0; i < countToAdd + gaussianDistance*2; i++) {
          gaussianDists.push(gaussianDistribution(Math.random()*90 + 10))
        }
        console.log(gaussianDists)
        let gaussianSums: number[] = [];
        for (let i=gaussianDistance; i < countToAdd; i++) {
          let sum = 0
          for (let j=0; j < gaussianDistance*2; j++) {
            sum += gaussianDists[i-(j-gaussianDistance)][j]
          }

          let MAGIC_NUMBER_A = 5.5

          let localizedToZero = sum/e-1
          let scaledToOne = localizedToZero*MAGIC_NUMBER_A
          let scaledToRange = (scaledToOne*gaussianRange/2) + gaussianMid
          let clamppedToRange = 
            scaledToRange > gaussianMax 
              ? gaussianMax
              : scaledToRange < gaussianMin
                ? gaussianMin
                : scaledToRange
          if (clamppedToRange != scaledToRange) {
            console.log(scaledToRange)
          }
          gaussianSums.push(clamppedToRange)
        }
        console.log(gaussianSums)
        console.log(`average: ${
          gaussianSums
            .reduce(
              (previousValue, currentValue) => previousValue+currentValue,
               0)
            /gaussianSums.length
        }`)
        console.log(`min: ${
          gaussianSums
            .reduce(
              (previousValue, currentValue) => (previousValue<currentValue) ? previousValue : currentValue,
               Number.MAX_VALUE)
        }`)
        console.log(`max: ${
          gaussianSums
            .reduce(
              (previousValue, currentValue) => (previousValue>currentValue) ? previousValue : currentValue,
               0)
        }`)
        for (let i=0; i < gaussianSums.length; i++) {
          this.topRowBoxes.push({
            spawnIncrement: gaussianSums[i]*(spawnIncrementMax - spawnIncrementMin) + spawnIncrementMin,
            spawnCountdown: gaussianSums[i]*(spawnCountdownMax - spawnCountdownMin) + spawnCountdownMin,
            boxes: [],
            doneAnimating: false,
          })
        }
      }
    },

    async renderLoop() {
      let thisTimestamp = Date.now();
      await this.renderScene(thisTimestamp - lastTimestamp);
      lastTimestamp = thisTimestamp;
      //Attempt force framerate
      await new Promise(resolve => setTimeout(resolve, 50));
      window.requestAnimationFrame(this.renderLoop);
    },

    async renderScene(interval: number) {
      for (let key in this.topRowBoxes) {
        this.calculateColumn(Number(key), interval);
      }
    },

    async calculateColumn(index: number, interval: number) {
      let column = this.topRowBoxes[index]

      if (column.doneAnimating || (column.boxes.length-topBuffer)*boxSize > window.outerHeight) {
        column.doneAnimating = true;
        return;
      }

      if(column.spawnCountdown < 0) {
        column.spawnCountdown += 1;
      } else {
        column.spawnCountdown += column.spawnIncrement;
      }
      if (column.spawnCountdown >= 1) {
        column.spawnCountdown = 0
        let position = { x: index, y: column.boxes.length };
        let color = {
          r: Math.random()*50 + 0,
          g: Math.random()*255 + 0,
          b: Math.random()*50 + 200,
        };

        let fakeBackground = {
          r: 29,
          g: 65,
          b: 107,
        };

        color.r += fakeBackground.r;
        color.r /= 2;
        color.g += fakeBackground.g;
        color.g /= 2;
        color.b += fakeBackground.b;
        color.b /= 2;

        let parent = null;
        let leftCousin = null;
        let rightCousin = null;

        parent = column.boxes[column.boxes.length-1];
        let leftLineage = this.topRowBoxes[index - 1];
        if (leftLineage) {
          leftCousin = leftLineage.boxes[column.boxes.length - 1]
        }
        let rightLineage = this.topRowBoxes[index + 1];
        if (rightLineage) {
          rightCousin = rightLineage.boxes[column.boxes.length - 1]
        }
        let colorToTint = {
          r: 0,
          g: 0,
          b: 0,
          a: 0
        }
        let colorsAdded = 0;
        if (parent) {
          colorToTint.r += parent.color.r;
          colorToTint.g += parent.color.g;
          colorToTint.b += parent.color.b;
          colorsAdded += 1;
        }
        if (leftCousin) {
          colorToTint.r += leftCousin.color.r;
          colorToTint.g += leftCousin.color.g;
          colorToTint.b += leftCousin.color.b;
          colorsAdded += 1;
        }
        if (rightCousin) {
          colorToTint.r += rightCousin.color.r;
          colorToTint.g += rightCousin.color.g;
          colorToTint.b += rightCousin.color.b;
          colorsAdded += 1;
        }
        if(colorsAdded != 0) {
          colorToTint.r /= colorsAdded;
          colorToTint.g /= colorsAdded;
          colorToTint.b /= colorsAdded;

          let randomMultiplier = 1;
          let consistentMultiplier = 10;
          let multiplierSum = randomMultiplier + consistentMultiplier;

          let red =
            randomMultiplier * color.r
            + consistentMultiplier * colorToTint.r;
          let green =
            randomMultiplier * color.g
            + consistentMultiplier * colorToTint.g;
          let blue =
            randomMultiplier * color.b
            + consistentMultiplier * colorToTint.b;

          red = Math.floor(red/multiplierSum);
          green = Math.floor(green/multiplierSum);
          blue = Math.floor(blue/multiplierSum);

          color.r = red;
          color.g = green;
          color.b = blue;
        }


        column.boxes.push({
          position: position,
          color: color,
        })
        this.addBox(position, color)
      }
    },
    addBox(position: { x: number, y: number }, color: { r: number, g: number, b: number}) {
      let rect = 
        this.draw
          .rect(boxSize, boxSize)
          .move(position.x*boxSize, (position.y-topBuffer)*boxSize)
          .attr({ fill: rgbaToHex(color) })
    },
  },

  created() {
    window.addEventListener("resize", this.resizedWindow);
  },

  destroyed() {
    window.removeEventListener("resize", this.resizedWindow);
  },

  async mounted() {
    console.log("Hello, world!");
    this.draw = SVG().addTo('#animation-base').size("100%", "100%")
    await this.resizedWindow();
    await new Promise(resolve => setTimeout(resolve, 400))
    lastTimestamp = Date.now()
    window.requestAnimationFrame(this.renderLoop);
  },
}

function rgbaToHex(rgb: { r: number, g: number, b: number}) {
  return `#${decToTwoDigitHex(rgb.r)}${decToTwoDigitHex(rgb.g)}${decToTwoDigitHex(rgb.b)}`
}
function decToTwoDigitHex(dec: number) {
  let hexRaw = Math.floor(dec).toString(16);
  return (hexRaw.length==1) ? "0"+hexRaw : hexRaw;
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
    //let variance: CGFloat = standardDeviation*standardDeviation
    let sqrtTwoPiVariance: number = Math.sqrt(2*Math.PI*variance)
    let negativeXSquaredOver2Variance: number = 1-(x*x)/(2*variance)
    let output: number = (1/sqrtTwoPiVariance)*Math.pow(e, negativeXSquaredOver2Variance)
    return output
}
</script>

<template>
  <div id="animation-base">
  </div>
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
