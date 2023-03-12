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

let id: string


let getImgUri = (photoID: string) => {
  return `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/${photoID}/w-640.jpg`
}

export default {
  props: [
    'photo'
  ],
  setup(props) {
    let height = 320 / props.photo.dimensionsRatio
    let latestData: any = decode(
        props.photo.blurHash,
        320,
        Math.ceil(height)
      )
    id = props.photo.id



    onMounted(async () => {
      /*try {
        let response = fetch(getImgUri(id))
      } catch (err) {

      }*/
    });

    onUnmounted(async () => {

    });
    
    return {
      latestData,
      height,
      getImgUri
    }
  },
  directives: {
    newData: function(canvasElement, binding) {
      let ctx = canvasElement.getContext("2d")
      //ctx.clearRect(0, 0, 320, binding.instance.height)

      //console.log(JSON.stringify(binding.instance))

      //console.log(binding.instance.height)
      //console.log(binding.value)

      const imageData = new ImageData(binding.value, 320)
      try {
      //imageData.data.set(binding.instance.latestData)
      } catch (err) { 
        console.log(err.message)
      }
      ctx.putImageData(imageData, 0, 0)
    }
  }
}

</script>

<template lang='pug'>
div
  canvas(
    width="320"
    :height="height"
    v-new-data="latestData"
  )
</template>

<style>

</style>