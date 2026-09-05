<script setup lang="ts">
import { ref } from 'vue'

const clearing = ref(false)
const result = ref('')

async function clearCache() {
  if (clearing.value) return
  clearing.value = true
  result.value = ''

  try {
    const localEntries = localStorage.length
    const sessionEntries = sessionStorage.length
    localStorage.clear()
    sessionStorage.clear()

    let deletedCacheCount = 0
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      const deletedCaches = await Promise.all(cacheNames.map((name) => caches.delete(name)))
      deletedCacheCount = deletedCaches.filter(Boolean).length
    }

    result.value = `Cleared ${localEntries + sessionEntries} stored entries and ${deletedCacheCount} browser caches.`
  } catch (error) {
    result.value = error instanceof Error ? error.message : 'Could not clear the site cache.'
  } finally {
    clearing.value = false
  }
}
</script>

<template>
  <main class="dev-panel">
    <header>
      <p class="eyebrow">Development</p>
      <h1>Site tools</h1>
      <p class="intro">Utilities for inspecting and resetting local site behavior.</p>
    </header>

    <section class="tool-card" aria-labelledby="cache-heading">
      <div>
        <h2 id="cache-heading">Browser cache</h2>
        <p>
          Clears this site's local and session storage, including photo exposure history, plus
          Cache Storage entries. The current page remains open.
        </p>
      </div>
      <button type="button" :disabled="clearing" @click="clearCache">
        {{ clearing ? 'Clearing…' : 'Clear cache' }}
      </button>
      <p v-if="result" class="result" role="status">{{ result }}</p>
    </section>
  </main>
</template>

<style scoped>
.dev-panel {
  align-self: center;
  box-sizing: border-box;
  color: var(--text);
  display: grid;
  gap: 1.5rem;
  max-width: 44rem;
  padding: 2rem;
  width: 100%;
}

.eyebrow {
  color: var(--accent);
  font-family: 'Azeret Mono Variable', monospace;
  font-size: 0.65rem;
  font-weight: 650;
  letter-spacing: 0.08em;
  margin-bottom: 0.4rem;
  text-transform: uppercase;
}

h1 {
  font-size: clamp(2rem, 7vw, 3.5rem);
  font-weight: 700;
  line-height: 1;
}

.intro,
.tool-card p {
  color: var(--muted);
  line-height: 1.5;
}

.intro {
  margin-top: 0.8rem;
}

.tool-card {
  align-items: center;
  background: color-mix(in srgb, Canvas 45%, transparent);
  border: 1px solid color-mix(in srgb, CanvasText 14%, transparent);
  border-radius: 0.8rem;
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 1.1rem;
}

h2 {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 0.35rem;
}

.tool-card p {
  font-size: 0.8rem;
}

button {
  background: var(--accent);
  border: 0;
  border-radius: 0.55rem;
  color: white;
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.65rem 0.9rem;
}

button:hover,
button:focus-visible {
  filter: brightness(1.08);
}

button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.result {
  grid-column: 1 / -1;
  margin: 0;
}

@media (max-width: 34rem) {
  .dev-panel {
    padding: 1.25rem;
  }

  .tool-card {
    align-items: stretch;
    grid-template-columns: 1fr;
  }
}
</style>
