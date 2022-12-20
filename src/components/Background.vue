<script>
import BackgroundBox from './BackgroundBox.vue';
import Vue from 'vue';
var BoxClass = Vue.extend(BackgroundBox);

let boxSize = 10;

export default {
  data() {
    return { 
      topRowBoxes: {
        countPerSide: 0,
        left: [ ],
        right: [ ],
      },
      baseElement: null,
    };
  },

  methods: {
    async resizedWindow() {
      let newWidthRaw = window.outerWidth/boxSize;
      let newWidthPerSideRaw = newWidthRaw/2;
      let newPixelsPerSide = Math.ceil(newWidthPerSideRaw) + 1;
      let oldPixelsPerSide = this.topRowBoxes.left.length;
      let countToAdd = newPixelsPerSide - oldPixelsPerSide;

      console.log(countToAdd);

      if (countToAdd === 0) {
        return;

      } else if(countToAdd < 0) {
        //Subtract boxes
        let countToDelete = Math.abs(countToAdd);
        for(let i=0; i< countToDelete; i++) {
          let columnLeft = this.topRowBoxes[i];
          for(let index in columnLeft.boxes) {
            let toDelete = columnLeft.boxes[index].element;
            toDelete.parentNode.removeChild(toDelete);
          }
          let columnRight = this.topRowBoxes[i];
          for(let index in columnLeft.boxes) {
            let toDelete = columnRight.boxes[index].element;
            toDelete.parentNode.removeChild(toDelete);
          }
        }
        this.topRowBoxes.left.splice(this.topRowBoxes.left.length - countToDelete, countToDelete);
        this.topRowBoxes.right.splice(this.topRowBoxes.left.length - countToDelete, countToDelete);

      } else if(countToAdd > 0) {
        //Add boxes
        let sides = [this.topRowBoxes.left, this.topRowBoxes.right]
        for(let sideIndex in sides) {
          [...Array(countToAdd)].forEach((v, i) => {
            sides[sideIndex].push(
              {
                spawnIncrement: Math.random()+0.5,
                spawnCountdown: -Math.random()*100,
                boxes: [ ],
              }
            );
          })
          if (oldPixelsPerSide === 0) {
            let slowOnes = getRandomElements(sides[sideIndex], 3);
            for(let slowOneIndex in slowOnes) {
              slowOnes[slowOneIndex].spawnIncrement = 0.5 + Math.random()/10;
            }
            let fastOnes = getRandomElements(sides[sideIndex], 3);
            for(let fastOneIndex in fastOnes) {
              fastOnes[fastOneIndex].spawnIncrement = 1.5 - Math.random()/10;
            }
          }
        }
      }
    },

    async renderLoop() {
      console.log("render loop");
      await Promise.all([
        new Promise(r => setTimeout(r, 50)),
        this.renderScene(),
      ]);
      this.renderLoop();
    },

    async renderScene() {
      console.log("render scene");
      let sidesAndDirections = [
        {side: this.topRowBoxes.left, dir: -1},
        {side: this.topRowBoxes.right, dir: 1}
      ];
      for (let index in sidesAndDirections) {
        let side = sidesAndDirections[index].side;
        let direction = sidesAndDirections[index].dir;
        //console.log(side);
        //console.log(JSON.stringify(side));
        for (let indexB in side) {
          this.renderColumn(side, Number(indexB), side[indexB], direction*(Number(indexB)+1));
        }
      }
    },

    async renderColumn(side, sideIndex, column, xPosition) {
      console.log("render column");
      if(column.spawnCountdown < 0) {
        column.spawnCountdown += 1;
      } else {
        column.spawnCountdown += column.spawnIncrement;
      }
      if(
        column.spawnCountdown >= column.spawnIncrement
        && (column.boxes.length-1)*boxSize < window.outerHeight
      ) {
        column.spawnCountdown = 0
      
        let position = { x: xPosition, y: column.boxes.length };

        let color = color = { 
          r: Math.floor(Math.random()*50) + 0,
          g: Math.floor(Math.random()*50) + 100,
          b: Math.floor(Math.random()*50) + 200,
          a: Math.floor(Math.random()*200) + 25,
        };
        let parent = null;
        let leftCousin = null;
        let rightCousin = null;
        
        parent = column.boxes[column.boxes.length-1];
        let leftLineage = side[sideIndex - 1];
        if (leftLineage) {
          leftCousin = leftLineage.boxes[column.boxes.length - 1]
        }
        let rightLineage = side[sideIndex + 1];
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
          colorToTint.a += parent.color.a;
          colorsAdded += 1;
        }
        if (leftCousin) {
          colorToTint.r += leftCousin.color.r;
          colorToTint.g += leftCousin.color.g;
          colorToTint.b += leftCousin.color.b;
          colorToTint.a += leftCousin.color.a;
          colorsAdded += 1;
        }
        if (rightCousin) {
          colorToTint.r += rightCousin.color.r;
          colorToTint.g += rightCousin.color.g;
          colorToTint.b += rightCousin.color.b;
          colorToTint.a += rightCousin.color.a;
          colorsAdded += 1;
        }
        if(colorsAdded != 0) {
          colorToTint.r /= colorsAdded;
          colorToTint.g /= colorsAdded;
          colorToTint.b /= colorsAdded;
          colorToTint.a /= colorsAdded;

          let randomMultiplier = 1;
          let consistentMultiplier = 3;
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
          let alpha =
            randomMultiplier * color.a
            + consistentMultiplier * colorToTint.a;

          red = Math.floor(red/multiplierSum);
          green = Math.floor(green/multiplierSum);
          blue = Math.floor(blue/multiplierSum);
          alpha = Math.floor(alpha/multiplierSum);

          color.r += red;
          color.g += green;
          color.b += blue;
          color.a += alpha;
        }

        column.boxes.push({
          position: position,
          color: color,
          element: this.addBox(position, color),
        });
      }
    },

    addBox(position, color) {
      console.log("add box");
      var newBox = new BoxClass({
        propsData: {
          position: position,
          color: color,
        }
      });
      newBox.$mount();
      this.baseElement.appendChild(newBox.$el);
      return newBox;
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
    this.baseElement = document.getElementById('animation-base');
    await this.resizedWindow();
    this.renderLoop();
  },
}

function getRandomElements(arr, n) {
    var result = new Array(n),
        len = arr.length,
        taken = new Array(len);
    if (n > len)
        throw new RangeError("getRandom: more elements taken than available");
    while (n--) {
        var x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}
</script>

<template>
  <div id="animation-base" style="
    position: absolute;
    left: 50vw;
  ">
  </div>
</template>
