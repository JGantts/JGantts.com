<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const darkModePreference = window.matchMedia('(prefers-color-scheme: dark)')
const isPhotosPage = computed(() => route.path.startsWith('/photos'))
const layoutClass = computed(() => ({
  'layout--photos': isPhotosPage.value,
}))
const shortCommitId = __APP_COMMIT__ === 'dev' ? __APP_COMMIT__ : __APP_COMMIT__.slice(0, 7)
const commitMessage = __APP_COMMIT_MESSAGE__
const isCommitMessageVisible = ref(false)
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
      <button
        class="version-tag"
        type="button"
        :aria-expanded="isCommitMessageVisible"
        :aria-label="isCommitMessageVisible ? 'Show site build commit ID' : 'Show site build commit message'"
        @click="isCommitMessageVisible = !isCommitMessageVisible"
      >
        <span class="version-label">
          {{ isCommitMessageVisible ? 'Build description' : 'Site build' }}
        </span>
        <span class="version-value">
          {{ isCommitMessageVisible ? commitMessage : shortCommitId }}
        </span>
      </button>
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
  align-items: baseline;
  align-self: center;
  background: color-mix(in srgb, currentColor 3%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 999px;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  gap: 0.35rem;
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.55rem;
  line-height: 1.35;
  max-width: min(100%, 42rem);
  opacity: 0.52;
  padding: 0.2rem 0.42rem;
  text-decoration: none;
}

.version-tag:hover {
  border-color: color-mix(in srgb, currentColor 38%, transparent);
  opacity: 0.82;
}

.version-tag:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.version-label {
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

.version-label::after {
  content: ':';
}

.version-value {
  opacity: 0.68;
  overflow-wrap: anywhere;
  text-align: left;
}
</style>

<style>
html.dark .main.layout--photos {
  --layout-bg: #111716;
}
</style>
