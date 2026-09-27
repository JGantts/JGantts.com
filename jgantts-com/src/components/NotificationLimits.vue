<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { notificationLimits } from '@/notifications/client'
const day = ref<string | number>('')
const week = ref<string | number>('')
const loaded = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')
async function load() {
  busy.value = true; error.value = ''
  try {
    const limits = await notificationLimits()
    day.value = limits.maxPerDay ?? ''; week.value = limits.maxPerWeek ?? ''; loaded.value = true
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Could not load limits.' }
  finally { busy.value = false }
}
async function save() {
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await notificationLimits({ maxPerDay: day.value === '' ? null : Number(day.value), maxPerWeek: week.value === '' ? null : Number(week.value) })
    notice.value = 'Notification limits saved for this installation.'
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Could not save limits.' }
  finally { busy.value = false }
}
onMounted(load)
</script>
<template>
  <section class="limits" aria-labelledby="limits-heading">
    <h2 id="limits-heading">How often to notify you</h2>
    <p>Set a maximum for this installation. Leave a field blank for unlimited; use 0 to stop new-post notifications.</p>
    <p v-if="!loaded && busy">Loading limits…</p>
    <form v-if="loaded" @submit.prevent="save">
      <label for="daily-limit">Maximum per day</label>
      <input id="daily-limit" v-model="day" type="number" min="0" max="1000" step="1" inputmode="numeric" placeholder="Unlimited" :disabled="busy">
      <label for="weekly-limit">Maximum per week</label>
      <input id="weekly-limit" v-model="week" type="number" min="0" max="1000" step="1" inputmode="numeric" placeholder="Unlimited" :disabled="busy">
      <p class="explanation">Both limits apply, counting the last 24 hours and 7 days. Extra notifications are skipped, not held for later. Test notifications are excluded. Notifications already sending may still arrive.</p>
      <button :disabled="busy" type="submit">{{ busy ? 'Saving…' : 'Save limits' }}</button>
    </form>
    <p v-if="error" role="alert">{{ error }}</p>
    <button v-if="!loaded && !busy" type="button" @click="load">Retry loading limits</button>
    <p v-if="notice" role="status">{{ notice }}</p>
  </section>
</template>
<style scoped>
.limits { margin: 2rem 0; border: 1px solid var(--muted); border-radius: 1rem; padding: 1.5rem; }
h2 { font-size: 1.2rem; } form { display: grid; gap: .5rem; } input, button { box-sizing: border-box; min-height: 44px; max-width: 100%; padding: .6rem; font: inherit; color: inherit; background: transparent; border: 1px solid var(--muted); border-radius: .4rem; } input { width: 100%; } button { justify-self: start; cursor: pointer; } :disabled { opacity: .6; } input:focus-visible, button:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; } .explanation { font-size: .85rem; }
</style>
