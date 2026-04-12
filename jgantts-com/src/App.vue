<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onBeforeUnmount } from 'vue'

import { setCSSColors } from '@/Curtain/ThemeHandler'
import { theme_dark, theme_light } from '@/Curtain/Themes'

const darkModePreference = window.matchMedia('(prefers-color-scheme: dark)')

darkModePreference.addEventListener('change', checkDarkMode)
checkDarkMode(darkModePreference)

function checkDarkMode(mediaMatch: MediaQueryList | MediaQueryListEvent) {
  if (mediaMatch.matches) {
    document.body.classList.add('dark-theme')
  } else {
    document.body.classList.remove('dark-theme')
  }

  setCSSColors(mediaMatch.matches ? theme_dark : theme_light)
}

onBeforeUnmount(() => {
  darkModePreference.removeEventListener('change', checkDarkMode)
})
</script>

<template>
  <RouterView />
</template>
