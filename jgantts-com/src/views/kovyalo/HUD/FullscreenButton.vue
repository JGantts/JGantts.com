<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ target: HTMLElement | null }>()
const emit = defineEmits<{ (event: 'resize'): void }>()
const supported = ref(false)
const active = ref(false)
const pending = ref(false)
const error = ref('')
const label = computed(() => active.value ? 'Exit full screen' : 'Full screen')

function syncFullscreen() {
  active.value = !!props.target && document.fullscreenElement === props.target
  error.value = ''
  emit('resize')
}

async function toggleFullscreen() {
  if (!props.target || pending.value) return
  pending.value = true
  error.value = ''
  try {
    if (document.fullscreenElement === props.target) {
      await document.exitFullscreen()
    } else {
      await props.target.requestFullscreen()
    }
  } catch {
    error.value = 'Full screen is unavailable. Please try again.'
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  supported.value = !!document.fullscreenEnabled && typeof props.target?.requestFullscreen === 'function'
  document.addEventListener('fullscreenchange', syncFullscreen)
  syncFullscreen()
})

onBeforeUnmount(() => document.removeEventListener('fullscreenchange', syncFullscreen))
</script>

<template>
  <div v-if="supported" class="fullscreen-control">
    <button
      type="button"
      :title="active ? 'Exit full screen (Esc)' : label"
      :aria-pressed="active"
      :disabled="pending"
      @click="toggleFullscreen"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path v-if="active" d="M9 3v6H3m12-6v6h6M3 15h6v6m12-6h-6v6" />
        <path v-else d="M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6" />
      </svg>
      {{ label }}
    </button>
    <span v-if="error" role="status">{{ error }}</span>
  </div>
</template>

<style scoped>
.fullscreen-control {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5em;
}
button,
span {
  padding: 7px 12px;
  border: 1px solid rgba(90, 60, 25, 0.35);
  border-radius: 6px;
  background: #e9dbc0;
  color: #2a1b0f;
  font: 600 13px system-ui, sans-serif;
}
button {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 0.5em;
  min-height: 36px;
  cursor: pointer;
}
button:hover { filter: brightness(1.05); }
button:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
span { max-width: 220px; }
.dark button,
.dark span {
  background: #3a2c1c;
  color: #f0e0b8;
  border-color: rgba(200, 160, 90, 0.35);
}
</style>
