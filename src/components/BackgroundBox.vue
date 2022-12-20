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
      return `#${decToTwoDigitHex(rbg.r)}${decToTwoDigitHex(rbg.g)}${decToTwoDigitHex(rbg.b)}`
    }
  },
}

function decToTwoDigitHex(dec) {
  let hexRaw = dec.toString(16);
  return (hexRaw.length==1) ? "0"+hexRaw : hexRaw;
}
</script>

<template>
  <div class="box">
  </div>
</template>

<style>
  .box {
    position: absolute;
    width: v-bind(boxSize);
    height: v-bind(boxSize);
  }
</style>

<style scoped>
  .box {
    background-color: v-bind("rgbToHex(color)");
    left: v-bind("position.x*boxSize");
    top: v-bind("position.y*boxSize")
  }
</style>
