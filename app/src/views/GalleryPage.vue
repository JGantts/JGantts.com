<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

var data = [
    {
        image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/h-768.jpg`,
        thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/h-100.jpg`,
        big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/h-768.jpg`,
        title: 'my first image',
        description: 'Lorem ipsum caption',
        link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/h-768.jpg`
    },
    {
        image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/2T73PZFUF7MO25VQY1AB/h-768.jpg`,
        thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/2T73PZFUF7MO25VQY1AB/h-100.jpg`,
        big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/2T73PZFUF7MO25VQY1AB/h-768.jpg`,
        title: 'my first image',
        description: 'Lorem ipsum caption',
        link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/2T73PZFUF7MO25VQY1AB/h-768.jpg`
    },
    {
        image: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,
        thumb: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-100.jpg`,
        big: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/L92I6G5W9N1RH69VP2W3/h-768.jpg`,
        title: 'my first image',
        description: 'Lorem ipsum caption',
        link: `${import.meta.env.VITE_APP_API_ENDPOINT}/photo-library/img/1UYDUUQCETTKS3XC8LXP/h-768.jpg`
    }
]

onMounted(async () => {
  load()
  await new Promise(resolve => {
    setTimeout(resolve, 500) 
  })
  let top = getOffset(document.getElementById('gallery')).top
  console.log(top);
  window.scroll({ left: 0, top, behavior: "smooth" });
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
  MyGalleria.loadTheme('https://cdnjs.cloudflare.com/ajax/libs/galleria/1.6.1/themes/classic/galleria.classic.min.js');
  MyGalleria.run('.galleria', {
    dataSource: data,
    width:parseInt(document.getElementById('gallery')?.style.width ?? "100"),
    height:parseInt(document.getElementById('gallery')?.style.height ?? "100")
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
  <div id="main02" class="main">
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
  width: 100vw;
  height: 100vh;
}
</style>