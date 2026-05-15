<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onBeforeUnmount } from 'vue'

const darkModePreference = window.matchMedia('(prefers-color-scheme: dark)')

darkModePreference.addEventListener('change', checkDarkMode)
checkDarkMode(darkModePreference)

function checkDarkMode(mediaMatch: MediaQueryList | MediaQueryListEvent) {
  document.body.classList.remove('dark')
  document.body.classList.remove('light')
  if (mediaMatch.matches) {
    document.body.classList.add('dark')
  } else {
    document.body.classList.add('light')
  }
}

onBeforeUnmount(() => {
  darkModePreference.removeEventListener('change', checkDarkMode)
})
</script>

<template>
  <RouterView />
</template>
