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

let getImgUri = (photoID: string) => {
  return `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/${photoID}/w-320.jpg`
}

export default {
  setup() {

    const data: any = reactive({ photos: ["L92I6G5W9N1RH69VP2W3"] })
    onMounted(async () => {
      // @ts-ignore
      document.getElementById('canvas-holder').classList.add('canvas-holder-grayscale')
      // @ts-ignore
      document.getElementById('app').classList.add('app-photo')
      document.body.classList.add('app-photo')
    });

    onUnmounted(async () => {
      // @ts-ignore
      document.getElementById('canvas-holder').classList.remove('canvas-holder-grayscale')
      // @ts-ignore
      document.getElementById('app').classList.remove('app-photo')
    });



    fetch(`${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/gallery/main`)
      .then(response => {
        return response.json()
      })
      .then(response => {
        console.log(response)
        data.photos.length = 0
        data.photos.push.apply(data.photos, response)
        //shuffle(photos)
      })
      .catch((err: Error) => {
      // @ts-ignore
        document.getElementById('gallery').innerHTML = `<p>${err.message}</p>`
      })
    
    return {
      data,
      getImgUri
    }
  }
}

function shuffle(array: any) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}


</script>

<template lang='pug'>
#main02
  .inner
    #container02.container.columns.full
      .wrapper
        section(id='gallery')
          img(v-for="photo in data.photos" :key="photo" :src="getImgUri(photo)")
</template>

<style>
#gallery {
  line-height: 0;
  column-gap: 8px;
  column-width: 320px;
}

#gallery img {
  width: 100%;
  height: auto;
  padding-bottom: 8px;
}

#gallery {
  width: 320px;
}

@media (min-width: 684px) {
#gallery {
  width: 684px;
}
}

@media (min-width: 976px) {
#gallery {
  width: 976px;
}
}

@media (min-width: 1304px) {
#gallery {
  width: 1304px;
}
}

@media (min-width: 1632px) {
#gallery {
  width: 1632px;
}
}

@media (min-width: 1960px) {
#gallery {
  width: 1960px;
}
}

@media (min-width: 2288px) {
#gallery {
  width: 2288px;
}
}

@media (min-width: 2616px) {
#gallery {
  width: 2616px;
}
}

</style>