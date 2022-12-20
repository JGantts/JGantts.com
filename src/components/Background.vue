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
      let newPixelsPerSide = Math.ceil(newWidthPerSideRaw);
      let oldPixelsPerSide = this.topRowBoxes.left.length;
      let countToAdd = newPixelsPerSide - oldPixelsPerSide;

      console.log(countToAdd);

      if (countToAdd === 0) {
        return;

      } else if(countToAdd < 0) {
        //Subtract boxes
        let countToDelete = Math.abs(countToAdd);
        this.topRowBoxes.left.splice(this.topRowBoxes.left.length - countToDelete, countToDelete);
        this.topRowBoxes.right.splice(this.topRowBoxes.left.length - countToDelete, countToDelete);

      } else if(countToAdd > 0) {
        //Add boxes
        let sides = [this.topRowBoxes.left, this.topRowBoxes.right]
        for(let sideIndex in sides) {
          [...Array(countToAdd)].forEach((v, i) => {
            sides[sideIndex].push(
              {
                spawnInterval: Math.floor(Math.random()*100),
                spawnCountdown: 0,
                boxes: [ ],
              }
            );
          })
          if (oldPixelsPerSide === 0) {
            let slowOnes = getRandomElements(sides[sideIndex], 3);
            for(let slowOneIndex in slowOnes) {
              slowOnes[slowOneIndex].spawnInterval = Math.floor(Math.random()*10) + 90;
            }
            let fastOnes = getRandomElements(sides[sideIndex], 3);
            for(let fastOneIndex in fastOnes) {
              fastOnes[fastOneIndex].spawnInterval = Math.floor(Math.random()*10);
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
          this.renderColumn(side[indexB], direction*(indexB+1));
        }
      }
    },

    async renderColumn(column, xPosition) {
      console.log("render column");
      column.spawnCountdown += 1;
      if(
        (column.length == 0 || column.spawnCountdown >= column.spawnInterval)
        && column.length*boxSize < window.outerHeight
      ) {
        let position = { x: xPosition, y: column.boxes.length };
        let color = { 
          r: Math.floor(Math.random()*10) + 190, 
          g: Math.floor(Math.random()*10) + 45, 
          b: Math.floor(Math.random()*10) + 245,
        };
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
    position: absolute,
    left: 50vw;
  ">
  </div>
</template>
