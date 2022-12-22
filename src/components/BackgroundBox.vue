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
    rgbaToHex(rgb) {
      return `#${decToTwoDigitHex(rgb.r)}${decToTwoDigitHex(rgb.g)}${decToTwoDigitHex(rgb.b)}${decToTwoDigitHex(rgb.a)}`
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
    '--backgroundColor': `${rgbaToHex(color)}`,
    '--left': `${position.x*boxSize - xDirection()*boxSize/2}px`,
    '--top': `${position.y*boxSize}px`,
    '--boxSize': `${boxSize*9/10}px`,
    '--borderWidth': `${boxSize*1/10}px`
  }">
  </div>
</template>

<style>
  .box {
    position: absolute;
    width: var(--boxSize);
    height: var(--boxSize);
    border-width: var(--borderWidth);
    border-color: rgba(0, 0, 0, 0);
  }

  .box {
    animation: fadeIn 1s;
    -webkit-animation: fadeIn 1s;
    -moz-animation: fadeIn 1s;
    -o-animation: fadeIn 1s;
    -ms-animation: fadeIn 1s;
  }

@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@-moz-keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@-webkit-keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@-o-keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@-ms-keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
</style>

<style scoped>
  .box {
    background-color: var(--backgroundColor);
    left: calc(var(--left) + 50vw);
    top: var(--top);
  }
</style>
