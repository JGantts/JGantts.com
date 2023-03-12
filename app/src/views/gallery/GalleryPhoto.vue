<script lang="ts">
import { 
  reactive, 
  ref,
  onMounted,
  onUnmounted,
  defineProps,
  watchEffect,
  //whenDepsChange
  computed,
watch
} from 'vue'
import { decode } from "blurhash";

let getImgUri = (photoID: string) => {
  return `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/${photoID}/w-${320 * window.devicePixelRatio}.jpg`
}

export default {
  props: [
    'photo'
  ],
  setup(props) {

    let widthPixels = 320
    let heightPixels = 320 / props.photo.dimensionsRatio

    let id = props.photo.id
    let elementID = 'photo-canvas-' + id

    console.log(id)

    onMounted(async () => {
      let blurData: any = decode(
          props.photo.blurHash,
          320,
          Math.ceil(heightPixels)
        )

      // @ts-ignore
      let ctx = document.getElementById(elementID).getContext("2d")

      const imageData = new ImageData(blurData, 320)
      ctx.putImageData(imageData, 0, 0)

      ctx.scale(1/window.devicePixelRatio, 1/window.devicePixelRatio)
      let tempImage = new Image()
      tempImage.onload = () => {
        console.log('why')
        ctx.drawImage(tempImage, 0, 0)
      }
      console.log('when')
      tempImage.src = getImgUri(id)
    });
 
    onUnmounted(async () => {

    });
    
    return {
      id,
      elementID,
      widthPixels,
      heightPixels,
      getImgUri
    }
  }
}

</script>

<template lang='pug'>
div
  canvas(
    :id="elementID"
    :width="widthPixels"
    :height="heightPixels"
  )
</template>

<style>

</style>