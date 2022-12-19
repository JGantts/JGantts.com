<script>
let pixelSize = 10;

export default {
  data() {
    return { 
      topRowBoxes: {
        countPerSide: 0,
        left: [ ],
        right: [ ],
      }
    };
  },
  methods: {
    async resizedWindow() {
      let newWidthRaw = window.outerHeight/pixelSize;
      let newWidthPerSideRaw = newWidthRaw/2;
      let newPixelsPerSide = Math.ceil(newWidthPerSideRaw);

      if (newPixelsPerSide = 0) {
        return;

      } else if(newPixelsPerSide < 0) {
        //Subtract boxes
        let countToDelete = Math.abs(newPixelsPerSide);
        this.topRowBoxes.left.splice(this.topRowBoxes.left.length - countToDelete, countToDelete);
        this.topRowBoxes.right.splice(this.topRowBoxes.left.length - countToDelete, countToDelete);

      } else if(newPixelsPerSide > 0) {
        //Add boxes
        for(side in [this.topRowBoxes.left, this.topRowBoxes.right]) {
          [...Array(newPixelsPerSide)].forEach((v, i) => {
            side.push(
              [ ]
            );
          })
        }
      }
    },
    async renderLoop() {
      await Promise.all(
        new Promise(r => setTimeout(r, 50)),
        this.render(),
      );
      this.renderLoop();
    },
    async render() {
      for(sideAndDirection in [
        {side: this.topRowBoxes.left, dir: -1},
        {side: this.topRowBoxes.right, dir: 1}
      ]) {
        let side = sideAndDirection.side;
        let direction = sideAndDirection.dir;
        side.forEach(function (column, index) {
          
        });
      }
    }
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
</script>

<template>
  <div id="animation-base">
  </div>
</template>
