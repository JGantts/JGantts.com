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
      baseElement: document.getElementById('animation-base'),
    };
  },

  methods: {
    async resizedWindow() {
      let newWidthRaw = window.outerWidth/boxSize;
      let newWidthPerSideRaw = newWidthRaw/2;
      let newPixelsPerSide = Math.ceil(newWidthPerSideRaw);
      let oldPixelsPerSide = this.topRowBoxes.left.length;
      let countToAdd = newPixelsPerSide - oldPixelsPerSide;

      if (countToAdd = 0) {
        return;

      } else if(countToAdd < 0) {
        //Subtract boxes
        let countToDelete = Math.abs(countToAdd);
        this.topRowBoxes.left.splice(this.topRowBoxes.left.length - countToDelete, countToDelete);
        this.topRowBoxes.right.splice(this.topRowBoxes.left.length - countToDelete, countToDelete);

      } else if(countToAdd > 0) {
        //Add boxes
        for(let side in [this.topRowBoxes.left, this.topRowBoxes.right]) {
          [...Array(newPixelsPerSide)].forEach((v, i) => {
            side.push(
              {
                spawnInterval: Math.floor(Math.random()*100),
                spawnCountdown: 0,
                boxes: [ ],
              }
            );
          })
        }
        if (oldPixelsPerSide === 0) {
          let slowOnes = getRandomElements(side, 3);
          for(let slowOne in slowOnes) {
            slowOne.spawnInterval = Math.floor(Math.random()*10) + 90;
          }
          let fastOnes = getRandomElements(side, 3);
          for(let fastOne in fastOnes) {
            fastOne.spawnInterval = Math.floor(Math.random()*10);
          }
        }
      }
    },

    async renderLoop() {
      await Promise.all(
        new Promise(r => setTimeout(r, 50)),
        this.renderScene(),
      );
      this.renderLoop();
    },

    async renderScene() {
      for(sideAndDirection in [
        {side: this.topRowBoxes.left, dir: -1},
        {side: this.topRowBoxes.right, dir: 1}
      ]) {
        let side = sideAndDirection.side;
        let direction = sideAndDirection.dir;
        side.forEach(function (column, index) {
          this.renderColumn(column, direction*(index+1));
        });
      }
    },

    async renderColumn(column, xPosition) {
      column.spawnCountdown += 1;
      if(column.length == 0 || column.spawnCountdown >= column.spawnInterval) {
        let position = { x: xPosition, y: column.boxes.length };
        let color = { 
          r: Math.floor(Math.random()*10) + 190, 
          g: Math.floor(Math.random()*10) + 45, 
          b: Math.floor(Math.random()*10) + 245,
        };
        column.push({
          position: position,
          color: color,
          element: this.addBox(position, color),
        });
      }
    },

    addBox(position, color) {
      var newBox = new BoxClass({
        propsData: {
          position: position,
          color: color,
        }
      });
      newBox.$mount();
      baseElement.appendChild(newBox.$el);
      return newBox;
    },
  },

  created() {
    window.addEventListener("resize", this.resizedWindow);
  },

  destroyed() {
    window.removeEventListener("resize", this.resizedWindow);
  },

  mounted() {
    console.log("Hello, world!");
    this.resizedWindow();
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
