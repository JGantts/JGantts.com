<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onBeforeUnmount } from 'vue'

const darkModePreference = window.matchMedia('(prefers-color-scheme: dark)')

darkModePreference.addEventListener('change', checkDarkMode)
checkDarkMode(darkModePreference)

function checkDarkMode(mediaMatch: MediaQueryList | MediaQueryListEvent) {
  document.documentElement.classList.remove('dark')
  document.documentElement.classList.remove('light')
  if (mediaMatch.matches) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.add('light')
  }
}

onBeforeUnmount(() => {
  darkModePreference.removeEventListener('change', checkDarkMode)
})
</script>

<template>
  <RouterView />
</template>

<style>
  html {
    color: var(--text);
    font-size: 1.25em;
  }
</style>
