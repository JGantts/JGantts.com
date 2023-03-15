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
    let scaleRatio = 15
    let currentLoadLevel = 0

    let widthPixels: number
    let heightPixels: number

    let widthPoints: number
    let heightPoints: number

    let widthSmall: number
    let heightSmall: number

    let id: string
    let elementID: string

    function unhashBlur(
      level: number,
      blurhash: string,
      canvas: HTMLCanvasElement
    ) {
      //create blur
      console.log(`${id} ${blurhash}`)
      let blurData: any = decode(
        blurhash,
        widthSmall,
        heightSmall
      )
      const imageData = new ImageData(blurData, widthSmall)

      let tempCanvas = document.createElement('canvas') as HTMLCanvasElement
      let tempCtx = tempCanvas.getContext("2d")!

      let ctx = canvas.getContext("2d")!

      //draw blur @ small scale
      tempCtx.putImageData(imageData, 0, 0)

      //draw blur @ large scale
      let tempImageBlur = new Image()
      //tempImageBlur.crossOrigin = "anonymous";  // This enables CORS
      tempImageBlur.onload = () => {
        console.log(`${currentLoadLevel} < ${level}`)
        if (currentLoadLevel < level) {
          ctx.drawImage(
            tempImageBlur,
            0, 0,
            widthSmall-1, heightSmall-1,
            0, 0,
            widthPoints, heightPoints
          )
          currentLoadLevel = level
        }
        console.log(`${currentLoadLevel} < ${level}`)
      }
      tempImageBlur.src = tempCanvas.toDataURL() 
    }

    function loadBlurhash(level: number, canvas: HTMLCanvasElement) {
      fetch(`${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/${id}/blurhash-${level}`)
          .then(response => {
            return response.json()
          })
          .then(response => {
            unhashBlur(level, response, canvas)
          })
          .catch((err: Error) => {
            console.log(err)
          })
    }

    widthPixels = 320
    heightPixels = Math.ceil(320 / props.photo.dimensionsRatio)

    widthPoints = widthPixels * window.devicePixelRatio
    heightPoints = heightPixels * window.devicePixelRatio

    widthSmall = Math.ceil(widthPixels/scaleRatio)
    heightSmall = Math.ceil(heightPixels/scaleRatio)

    id = props.photo.id
    elementID = 'photo-canvas-' + id


    onMounted(async () => {

      // @ts-ignore
      let canvas = document.getElementById(elementID) as HTMLCanvasElement
      let ctx = canvas.getContext("2d")!

      unhashBlur(1, props.photo.blurHash, canvas)

      //loadBlurhash(2, canvas)
      //loadBlurhash(3, canvas)
      //loadBlurhash(4, canvas)
      //loadBlurhash(5, canvas)
      //loadBlurhash(6, canvas)
      //loadBlurhash(7, canvas)
      //loadBlurhash(8, canvas)
      loadBlurhash(9, canvas)

      ctx.scale(1/window.devicePixelRatio, 1/window.devicePixelRatio)

      //draw final image
      let tempImageFinal = new Image()
      tempImageFinal.onload = () => {
        if (currentLoadLevel < 10) {
          ctx.clearRect(0, 0, widthPoints+1, heightPoints+1)
          ctx.drawImage(tempImageFinal, 0, 0)
          currentLoadLevel = 10
        }
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