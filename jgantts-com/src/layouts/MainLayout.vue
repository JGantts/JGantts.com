<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const darkModePreference = window.matchMedia('(prefers-color-scheme: dark)')
const isPhotosPage = computed(() => route.path.startsWith('/photos'))
const layoutClass = computed(() => ({
  'layout--photos': isPhotosPage.value,
}))
const shortCommitId = __APP_COMMIT__ === 'dev' ? __APP_COMMIT__ : __APP_COMMIT__.slice(0, 7)
const commitUrl = __APP_COMMIT__ === 'dev'
  ? undefined
  : `https://github.com/JGantts/JGantts.com/commit/${__APP_COMMIT__}`

const pageColors = computed(() =>
  route.path.startsWith('/photos')
    ? { light: '#f4efe8', dark: '#111716' }
    : { light: '#edf6ff', dark: '#10243e' },
)

function updatePageChrome() {
  const colors = pageColors.value
  const pageColor = darkModePreference.matches ? colors.dark : colors.light

  document.documentElement.style.setProperty('--page-bg', pageColor)

  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"][media*="light"]')
    ?.setAttribute('content', colors.light)
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"][media*="dark"]')
    ?.setAttribute('content', colors.dark)
}

watch(() => route.path, updatePageChrome, { immediate: true })
darkModePreference.addEventListener('change', updatePageChrome)

onBeforeUnmount(() => {
  darkModePreference.removeEventListener('change', updatePageChrome)
  document.documentElement.style.removeProperty('--page-bg')
})
</script>

<template>
  <div class="main" :class="layoutClass">
    <header class="my-header">
      <span class="header-lockup">
        <span class="site-wordmark"><span class="my-header-highlight">JGantts</span>.com</span>
        <span v-if="isPhotosPage" class="page-label">/photos</span>
      </span>
    </header>
    <router-view />
    <footer class="my-footer">
      <p class="email">contact@jgantts.com</p>
      <p class="copyright">
      © 2026 Jacob Gantt
      </p>
      <a v-if="commitUrl" class="version-tag" :href="commitUrl">{{ shortCommitId }}</a>
      <span v-else class="version-tag">{{ shortCommitId }}</span>
    </footer>
  </div>
</template>

<style>
:root,
.light {
  --bg: var(--blue-5);
  --text: var(--slate-12);
  --muted: var(--slate-11);
  --border: var(--blue-4);
  --accent: var(--tomato-9);
}

.dark {
  --bg: var(--blue-6);
  --text: var(--slate-12);
  --muted: var(--slate-11);
  --border: var(--blue-4);
  --accent: var(--tomato-10);
}

html {
  background-color: var(--page-bg, var(--bg));
  color: var(--text);
}

body {
  background-color: var(--page-bg, var(--bg));
}
</style>

<style scoped>
.main {
  background: var(--layout-bg, var(--bg));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100svh;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  padding-top: env(safe-area-inset-top, 0px);
}

.layout--photos {
  --layout-bg: #f4efe8;
  padding-left: 0;
  padding-right: 0;
}

.layout--photos .my-header {
  margin-left: calc(2rem + env(safe-area-inset-left, 0px));
  margin-right: calc(2rem + env(safe-area-inset-right, 0px));
}

.layout--photos .my-footer {
  margin-left: calc(1rem + env(safe-area-inset-left, 0px));
  margin-right: calc(1rem + env(safe-area-inset-right, 0px));
}

@media (max-width: 44rem) {
  .layout--photos {
    /* Blank runway after the footer for lifting the page bottom above mobile overlays. */
    padding-bottom: max(min(42dvh, 28rem), env(safe-area-inset-bottom, 0px));
  }
}

.my-header {
  align-items: center;
  display: flex;
  flex-direction: column;
  margin: 2rem;
  margin-bottom: 1rem;

  font-size: min(3em, calc((100vw - 4rem) / 6.3));
  text-align: center;
  font-display: block;
  font-weight: 400;
  color: var(--text);
  line-height: 1;
  white-space: nowrap;
}

.header-lockup {
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.site-wordmark {
  line-height: 1;
}

.page-label {
  color: var(--muted);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.5em;
  font-weight: 450;
  letter-spacing: 0.08em;
  line-height: 1;
}

.my-header-highlight {
  color: var(--accent);
}

.my-footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  margin: 1rem;

  text-align: center;
  color: var(--muted);
}


.copyright {
  font-size: 0.8rem;
}

.version-tag {
  color: inherit;
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.62rem;
  opacity: 0.55;
  text-decoration: none;
}

.version-tag:hover {
  opacity: 1;
  text-decoration: underline;
}
</style>

<style>
html.dark .main.layout--photos {
  --layout-bg: #111716;
}
</style>
