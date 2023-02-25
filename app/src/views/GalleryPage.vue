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
    {image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/w-190.jpg`,big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-2560.jpg`,title: 'my first image',description: 'Lorem ipsum caption',link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/full-size.jpg`},


 ]

onMounted(async () => {
  load()
  document.getElementById('canvas-holder').classList.add('canvas-holder-grayscale')
  /*await new Promise(resolve => { setTimeout(resolve, 500) })
  let top = getOffset(document.getElementById('container-nav')).top
  window.scroll({ left: 0, top, behavior: "smooth" });*/
})

onUnmounted(async () => {
  document.getElementById('canvas-holder').classList.remove('canvas-holder-grayscale')
})

function getOffset(el: Element|null): { left: number, top: number } {
  if (el === null) {
    return { left: 0, top: 0 }
  }  
  const rect = el.getBoundingClientRect();
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY
  };
}

function load() {
  // @ts-ignore
  let MyGalleria = Galleria as any
  MyGalleria.loadTheme('https://cdnjs.cloudflare.com/ajax/libs/galleria/1.6.1/themes/folio/galleria.folio.min.js');
  //body .galleria-thumbnails .galleria-image { width:200px }
  document.getElementsByClassName('galleria-thumbnails')[0]?.classList.add('new-width')
  MyGalleria.run('.galleria', {
    dataSource: data,
    width: parseInt(document.getElementById('gallery')?.style.width ?? "100"),
    height: parseInt(document.getElementById('gallery')?.style.height ?? "100"),
    _center: true
  });
}

function importJS(src: string) {
  const plugin = document.createElement("script");
  plugin.setAttribute("src", src);
  plugin.async = true;
  document.head.appendChild(plugin);
}
</script>

<template>
  <div id="main02" class="">
    <div class="inner">
      <div id="container02" class="container columns full">
        <div class="wrapper">
          <div id="gallery">
            <div class="galleria">
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
#gallery, .galleria {
  width: min(100vw, 1920px);
  height: 100vh;
}
</style>