<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

var data = [
    {
        image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/h-768.jpg`,
        thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/w-190.jpg`,
        big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/h-2560.jpg`,
        title: 'my first image',
        description: 'Lorem ipsum caption',
        link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`
    },
    {
        image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/2T73PZFUF7MO25VQY1AB/h-768.jpg`,
        thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/2T73PZFUF7MO25VQY1AB/w-190.jpg`,
        big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/2T73PZFUF7MO25VQY1AB/h-2560.jpg`,
        title: 'my first image',
        description: 'Lorem ipsum caption',
        link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/2T73PZFUF7MO25VQY1AB/full-size.jpg`
    },
    {
        image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,
        thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,
        big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,
        title: 'my first image',
        description: 'Lorem ipsum caption',
        link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/full-size.jpg`
    },

    /*{image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},
*/

 ]

onMounted(async () => {
  // @ts-ignore
  document.getElementById('canvas-holder').classList.add('canvas-holder-grayscale')
})

onUnmounted(async () => {
  // @ts-ignore
  document.getElementById('canvas-holder').classList.remove('canvas-holder-grayscale')
})

</script>

<template>
  <div id="main02" class="">
    <div class="inner">
      <div id="container02" class="container columns full">
        <div class="wrapper">
          <div id="gallery"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
#gallery {
  width: min(100vw, 1920px);
}
</style>