<script setup lang="ts">
import { ref } from 'vue'
import { adminRequest, jsonRequest } from '@/admin/api'
type Status = { activeSubscriptions: number; enabled: boolean; sendEnabled: boolean; audience: '*' | string[]; oldestPendingAgeSeconds: number; deliveries: { state: string; count: number }[] }
const status = ref<Status>()
const canaryId = ref('')
const message = ref('')
const busy = ref(false)
async function refresh() {
  busy.value = true
  try { status.value = await adminRequest<Status>('/api/admin/push/status'); message.value = '' }
  catch (error) { message.value = error instanceof Error ? error.message : 'Could not load push status.' }
  finally { busy.value = false }
}
async function sendTest() {
  if (!canaryId.value) return
  busy.value = true
  try {
    await adminRequest('/api/admin/push/test', jsonRequest('POST', { subscriptionId: canaryId.value }))
    message.value = 'Test queued for this installation. Provider acceptance does not confirm device delivery.'
  } catch (error) { message.value = error instanceof Error ? error.message : 'Could not queue test.' }
  finally { busy.value = false }
}
</script>
<template>
  <details class="push-admin" @toggle="event => { if ((event.target as HTMLDetailsElement).open && !status) refresh() }">
    <summary>Push notifications</summary>
    <template v-if="status">
      <p>{{ status.activeSubscriptions }} active installations · Enrollment {{ status.enabled ? 'on' : 'off' }} · Sending {{ status.sendEnabled ? 'on' : 'off' }}</p>
      <p>Audience: {{ status.audience === '*' ? 'all subscribers' : status.audience.length ? status.audience.join(', ') : 'nobody' }}. Oldest pending: {{ status.oldestPendingAgeSeconds }} seconds.</p>
      <ul><li v-for="item in status.deliveries" :key="item.state">{{ item.state }}: {{ item.count }}</li></ul>
    </template>
    <button type="button" :disabled="busy" @click="refresh">Refresh status</button>
    <form @submit.prevent="sendTest">
      <label>Canary installation ID <input v-model.trim="canaryId" type="text" placeholder="Installation UUID" autocapitalize="none" spellcheck="false" required /></label>
      <p>Find the ID in notification settings on the opted-in device. This sends one fixed test message.</p>
      <button type="submit" :disabled="busy || !status?.sendEnabled">Send test to this installation</button>
    </form>
    <p role="status">{{ message }}</p>
  </details>
</template>
<style scoped>
.push-admin { border: 1px solid var(--border); padding: 1rem; margin: 1rem 0; border-radius: .5rem; }
summary, button { cursor: pointer; min-height: 44px; }
form { margin-top: 1rem; }
input { width: min(100%, 25rem); box-sizing: border-box; margin-left: .5rem; min-height: 44px; }
</style>
