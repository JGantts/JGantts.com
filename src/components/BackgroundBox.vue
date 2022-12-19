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
      if(this.positons.x < 0) {
        return -1;
      }
      return 1;
    },
  },
}
</script>

<template>
  <div :style="{
    color: rgb(color.r, color.g, color.b),
    position: absolute,
    left: position.x*boxSize,
    top: position.y*boxSize,
    width: boxSize,
    height: boxSize,
  }">
  </div>
</template>
