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
import GalleryPhoto from './gallery/GalleryPhoto.vue'

export default {
  setup() {

    const data: any = reactive({ photos: [] })
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
        data.photos.length = 0
        data.photos.push.apply(data.photos, response)
        for (let i = data.photos.length - 1; i > 0; i--) {
          let j = Math.floor(Math.random() * (i + 1));
          [data.photos[i], data.photos[j]] = [data.photos[j], data.photos[i]];
        }
      })
      .catch((err: Error) => {
      // @ts-ignore
        document.getElementById('gallery').innerHTML = `<p>${err.message}</p>`
      })
    
    return {
      data,
      GalleryPhoto
    }
  },
  components: {
    GalleryPhoto
  }
}

</script>

<template lang='pug'>
#main02
  .inner
    #container02.container.columns.full
      .wrapper
        section(id='gallery')
          div(v-for="photo in data.photos" :key="photo.id" class='gallery-photo')
            GalleryPhoto(:photo=`photo`)
</template>

<style>
#gallery {
  line-height: 0;
  column-gap: 8px;
  column-width: 320px;
  color: white;
}

.gallery-photo {
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