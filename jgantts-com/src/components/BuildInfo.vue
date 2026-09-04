<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

interface BuildInfo {
  commitId: string
  commitMessage: string
}

const buildInfo = ref<BuildInfo | null>(null)
const isOpen = ref(false)
const rootElement = ref<HTMLElement | null>(null)
const triggerElement = ref<HTMLButtonElement | null>(null)
const abortController = new AbortController()

const shortCommitId = computed(() => buildInfo.value?.commitId.slice(0, 7) ?? '')
const commitUrl = computed(() =>
  buildInfo.value
    ? `https://github.com/JGantts/JGantts.com/commit/${encodeURIComponent(buildInfo.value.commitId)}`
    : '',
)

async function loadBuildInfo() {
  try {
    const response = await fetch('/api/build', {
      headers: { Accept: 'application/json' },
      signal: abortController.signal,
    })
    if (!response.ok) throw new Error(`Build API returned ${response.status}`)

    const value: unknown = await response.json()
    if (
      !value
      || typeof value !== 'object'
      || typeof (value as Partial<BuildInfo>).commitId !== 'string'
      || typeof (value as Partial<BuildInfo>).commitMessage !== 'string'
    ) {
      throw new Error('Build API returned an invalid response')
    }
    buildInfo.value = value as BuildInfo
  } catch (error) {
    if (!abortController.signal.aborted) {
      console.error('Could not load build information:', error)
    }
  }
}

function closeBuildInfo({ restoreFocus = false } = {}) {
  if (!isOpen.value) return
  isOpen.value = false
  if (restoreFocus) triggerElement.value?.focus()
}

function handleOutsidePointer(event: PointerEvent) {
  if (event.target instanceof Node && !rootElement.value?.contains(event.target)) {
    closeBuildInfo()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeBuildInfo({ restoreFocus: true })
}

onMounted(() => {
  void loadBuildInfo()
  document.addEventListener('pointerdown', handleOutsidePointer)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  abortController.abort()
  document.removeEventListener('pointerdown', handleOutsidePointer)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <aside v-if="buildInfo" ref="rootElement" class="build-info" aria-label="Site build">
    <button
      ref="triggerElement"
      class="build-trigger"
      type="button"
      aria-controls="build-details"
      :aria-expanded="isOpen"
      :title="isOpen ? 'Hide build details' : 'Show build details'"
      @click="isOpen = !isOpen"
    >
      <span class="visually-hidden">Site build </span>{{ shortCommitId }}
    </button>

    <Transition name="build-details">
      <section v-if="isOpen" id="build-details" class="build-popover">
        <header class="build-popover-header">
          <span>Site build</span>
          <button
            class="build-close"
            type="button"
            aria-label="Close build details"
            @click="closeBuildInfo({ restoreFocus: true })"
          >
            ×
          </button>
        </header>
        <p class="build-message">{{ buildInfo.commitMessage }}</p>
        <a class="build-link" :href="commitUrl" target="_blank" rel="noopener noreferrer">
          View {{ shortCommitId }} on GitHub
        </a>
      </section>
    </Transition>
  </aside>
</template>

<style scoped>
.build-info {
  bottom: max(0.35rem, env(safe-area-inset-bottom, 0px));
  color-scheme: light dark;
  font-family: 'Azeret Mono Variable', monospace;
  position: fixed;
  right: max(0.45rem, env(safe-area-inset-right, 0px));
  z-index: 1000;
}

.build-trigger {
  background: transparent;
  border: 0;
  color: CanvasText;
  cursor: pointer;
  font: inherit;
  font-size: 0.48rem;
  letter-spacing: 0.025em;
  opacity: 0.24;
  padding: 0.2rem;
  text-decoration: none;
  transition: opacity 120ms ease;
}

.build-trigger:hover,
.build-trigger:focus-visible,
.build-trigger[aria-expanded='true'] {
  opacity: 0.72;
}

.build-trigger:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 2px;
}

.build-popover {
  background: color-mix(in srgb, Canvas 94%, transparent);
  border: 1px solid color-mix(in srgb, CanvasText 14%, transparent);
  border-radius: 0.55rem;
  bottom: calc(100% + 0.35rem);
  box-shadow: 0 0.4rem 1.5rem color-mix(in srgb, #000 24%, transparent);
  box-sizing: border-box;
  color: CanvasText;
  font-family: 'Figtree Variable', sans-serif;
  max-width: calc(100vw - 1rem);
  padding: 0.65rem 0.7rem;
  position: absolute;
  right: 0;
  width: min(19rem, calc(100vw - 1rem));
}

.build-popover-header {
  align-items: center;
  display: flex;
  font-size: 0.62rem;
  font-weight: 700;
  justify-content: space-between;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.build-close {
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: 1rem;
  line-height: 0.8;
  opacity: 0.55;
  padding: 0.15rem;
}

.build-close:hover,
.build-close:focus-visible {
  opacity: 1;
}

.build-message {
  font-size: 0.72rem;
  line-height: 1.35;
  margin: 0.55rem 0;
  overflow-wrap: anywhere;
}

.build-link {
  color: inherit;
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.55rem;
  opacity: 0.58;
  text-underline-offset: 0.16em;
}

.build-link:hover,
.build-link:focus-visible {
  opacity: 1;
}

.build-details-enter-active,
.build-details-leave-active {
  transition: opacity 100ms ease, transform 100ms ease;
}

.build-details-enter-from,
.build-details-leave-to {
  opacity: 0;
  transform: translateY(0.2rem);
}

.visually-hidden {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .build-trigger,
  .build-details-enter-active,
  .build-details-leave-active {
    transition: none;
  }
}
</style>
