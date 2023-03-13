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

let scaleRatio = 15

export default {
  props: [
    'photo'
  ],
  setup(props) {

    let widthPixels = 320
    let heightPixels = Math.ceil(320 / props.photo.dimensionsRatio)

    let widthPoints = widthPixels * window.devicePixelRatio
    let heightPoints = heightPixels * window.devicePixelRatio

    let widthSmall = Math.ceil(widthPixels/scaleRatio)
    let heightSmall = Math.ceil(heightPixels/scaleRatio)

    let id = props.photo.id
    let elementID = 'photo-canvas-' + id

    console.log(id)

    //create blur
    let blurData: any = decode(
        props.photo.blurHash,
        widthSmall,
        heightSmall
      )
    const imageData = new ImageData(blurData, widthSmall)

    onMounted(async () => {

      // @ts-ignore
      let canvas = document.getElementById(elementID) as HTMLCanvasElement
      let ctx = canvas.getContext("2d")!

      //draw blur @ small scale
      ctx.putImageData(imageData, 0, 0)

      //draw blur @ large scale
      let tempImageBlur = new Image()
      tempImageBlur.onload = () => {
        //ctx.scale(scaleRatio*window.devicePixelRatio, scaleRatio*window.devicePixelRatio)
        ctx.drawImage(
          tempImageBlur,
          0, 0,
          widthSmall-1, heightSmall-1,
          0, 0,
          widthPoints, heightPoints
        )
      }
      tempImageBlur.src = canvas.toDataURL() 

      //reset scale
      //ctx.scale(1/scaleRatio, 1/scaleRatio)
      ctx.scale(1/window.devicePixelRatio, 1/window.devicePixelRatio)

      //draw final image
      let tempImageFinal = new Image()
      tempImageFinal.onload = () => {
        ctx.drawImage(tempImageFinal, 0, 0)
      }
      tempImageFinal.src = getImgUri(id)
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