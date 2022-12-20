<script>
export default {
  props: {
    position: Object,
    color: Object,
  },
  data() {
    return {
      boxSize: 10,
    }
  },
  methods: {
    xDirection() {
      if(this.position.x < 0) {
        return -1;
      }
      return 1;
    },
    rgbToHex(rgb) {
      return `#${decToTwoDigitHex(rgb.r)}${decToTwoDigitHex(rgb.g)}${decToTwoDigitHex(rgb.b)}`
    }
  },
}

function decToTwoDigitHex(dec) {
  let hexRaw = dec.toString(16);
  return (hexRaw.length==1) ? "0"+hexRaw : hexRaw;
}
</script>

<template>
  <div class="box" :style="{
    '--backgroundColor': `${rgbToHex(color)}`,
    '--left': `${position.x*boxSize - xDirection()*boxSize/2}px`,
    '--top': `${position.y*boxSize}px`,
    '--boxSize': `${boxSize}px`
  }">
  </div>
</template>

<style>
  .box {
    position: absolute;
    width: var(--boxSize);
    height: var(--boxSize);
  }
</style>

<style scoped>
  .box {
    background-color: var(--backgroundColor);
    left: var(--left);
    top: var(--top);
  }
</style>