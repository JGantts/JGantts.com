<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { disable, getConfiguration, needsInstallation, NotificationRequestError, persistSubscription, prepareWorker, storedInstallation, subscribe, supported, type PushConfiguration } from '@/notifications/client'

const state = ref('loading')
const problem = ref('')
const busy = ref(false)
const copyStatus = ref('')
const installationId = ref<string>()
const config = ref<PushConfiguration>()
let worker: ServiceWorkerRegistration | undefined
let existing: PushSubscription | null = null
let disposed = false
async function refresh() {
  if (busy.value || disposed) return
  busy.value = true
  problem.value = ''
  try {
    if (needsInstallation()) { state.value = 'install'; return }
    if (!supported()) { state.value = 'unsupported'; return }
    // Prepare worker even if the API is offline, so unsubscribe can be retried.
    worker = await prepareWorker()
    existing = await worker.pushManager.getSubscription()
    const record = storedInstallation()
    installationId.value = record?.id
    if (record?.disabling) { state.value = 'disable-pending'; return }
    if (Notification.permission === 'denied') {
      if (record || existing) await disable(worker)
      state.value = 'denied'; return
    }
    config.value = await getConfiguration()
    if (existing && (!record || record.keyVersion !== config.value.keyVersion || (record.endpoint && record.endpoint !== existing.endpoint))) { state.value = 'reset'; return }
    if (!existing && record?.endpoint) { state.value = 'reset'; return }
    if (existing && record) {
      if (!config.value.enabled) {
        state.value = record.id ? 'subscribed' : 'error'
        if (!record.id) problem.value = 'Enrollment is unavailable and this subscription has not been confirmed. Please retry later.'
        return
      }
      installationId.value = await persistSubscription(existing, config.value)
      state.value = 'subscribed'
    } else state.value = config.value.enabled ? 'ready' : 'unavailable'
  } catch (error) {
    state.value = error instanceof NotificationRequestError && error.status === 409 ? 'reset' : 'error'
    problem.value = error instanceof Error ? error.message : 'Could not connect. Please retry.'
  } finally { busy.value = false }
}
async function enable() {
  if (!worker || !config.value || busy.value) return
  busy.value = true
  problem.value = ''
  try {
    installationId.value = await subscribe(worker, config.value)
    state.value = 'subscribed'
  } catch (error) {
    state.value = Notification.permission === 'denied' ? 'denied' : 'error'
    problem.value = error instanceof Error ? error.message : 'Please retry notification setup.'
  } finally { busy.value = false }
}
async function turnOff() {
  if (!worker || busy.value) return
  busy.value = true
  problem.value = ''
  try {
    await disable(worker)
    installationId.value = undefined
    state.value = 'off'
  } catch (error) {
    state.value = 'disable-pending'
    problem.value = error instanceof Error ? error.message : 'Could not finish turning off notifications. Please retry.'
  } finally { busy.value = false }
}
async function copyInstallationId() {
  if (!installationId.value) return
  try {
    await navigator.clipboard.writeText(installationId.value)
    copyStatus.value = 'Installation ID copied.'
  } catch {
    copyStatus.value = 'Could not copy. Select and copy the ID above.'
  }
}
function onVisible() { if (document.visibilityState === 'visible') void refresh() }
onMounted(() => { void refresh(); document.addEventListener('visibilitychange', onVisible) })
onBeforeUnmount(() => { disposed = true; document.removeEventListener('visibilitychange', onVisible) })
</script>

<template>
  <main class="notification-settings">
    <p class="eyebrow">Stay in touch</p>
    <h1>New posts, on your terms.</h1>
    <p>Get a notification when a new photograph or story is published. No account needed. You can turn notifications off here at any time.</p>
    <div class="settings-card" aria-live="polite" :aria-busy="busy">
      <p v-if="state === 'loading'">Checking notification settings…</p>
      <template v-else-if="state === 'install'">
        <h2>Add JGantts to your Home Screen</h2>
        <p>On iPhone and iPad, open the installed app to enable notifications.</p>
        <RouterLink to="/install">See installation steps</RouterLink>
      </template>
      <p v-else-if="state === 'unsupported'">Notifications aren't available in this browser. You can still follow every post with the feed below.</p>
      <template v-else-if="state === 'ready'">
        <h2>Notify me about new posts</h2>
        <p>Your browser will ask for permission after you choose Enable.</p>
        <button type="button" :disabled="busy" @click="enable">Enable notifications</button>
      </template>
      <template v-else-if="state === 'subscribed'">
        <h2>Notifications are on</h2>
        <p>You're subscribed on this installation. Other browsers and devices have separate settings.</p>
        <button type="button" :disabled="busy" @click="turnOff">Turn off notifications</button>
      </template>
      <template v-else-if="state === 'denied'">
        <h2>Permission is turned off</h2>
        <p>To allow notifications, change this site's notification permission in your browser or device Settings, then return here.</p>
        <button type="button" :disabled="busy" @click="turnOff">Remove this subscription</button>
      </template>
      <template v-else-if="state === 'reset'">
        <h2>Reconnect this installation</h2>
        <p>Your saved subscription needs to be reset. Remove it, then choose Enable again to reconnect.</p>
        <button type="button" :disabled="busy" @click="turnOff">Reset subscription</button>
      </template>
      <template v-else-if="state === 'disable-pending'">
        <h2>Turning off isn't finished</h2>
        <p>Connect to the internet and retry so both this browser and the server stop the subscription.</p>
        <button type="button" :disabled="busy" @click="turnOff">Retry turning off</button>
      </template>
      <template v-else-if="state === 'off'">
        <h2>Notifications are off</h2>
        <button type="button" :disabled="busy" @click="refresh">Set up again</button>
      </template>
      <p v-else-if="state === 'unavailable'">New notification subscriptions are temporarily unavailable. Please check back later.</p>
      <template v-else-if="state === 'error'">
        <h2>Setup needs another try</h2>
        <p>We couldn't confirm your subscription. Your browser permission may already be saved.</p>
        <button type="button" :disabled="busy" @click="refresh">Retry setup</button>
        <button v-if="worker" type="button" :disabled="busy" @click="turnOff">Turn off instead</button>
      </template>
      <p v-if="problem" role="alert">{{ problem }}</p>
    </div>
    <p class="fine-print">Notifications may arrive later when your device is offline or in Focus mode. Delivery isn't guaranteed.</p>
    <p><a href="/feed.xml">Follow the Atom feed</a> · <RouterLink to="/photos">Back to photos</RouterLink></p>
    <details v-if="installationId" class="troubleshooting">
      <summary>Troubleshooting</summary>
      <p class="installation-id">Installation {{ installationId }}</p>
      <button type="button" @click="copyInstallationId">Copy installation ID</button>
      <p role="status">{{ copyStatus }}</p>
    </details>
  </main>
</template>

<style scoped>
.notification-settings { width: min(36rem, 100%); box-sizing: border-box; margin: 2rem auto 4rem; padding: 0 1.5rem; line-height: 1.65; font-size: 1rem; font-weight: 400; }
p { margin: .8rem 0; }
h1 { font-size: clamp(2rem, 7vw, 3rem); line-height: 1.12; letter-spacing: -.04em; }
h2 { font-size: 1.2rem; line-height: 1.3; }
.eyebrow { text-transform: uppercase; font-size: .75rem; letter-spacing: .15em; }
.settings-card { padding: 1.5rem; margin: 2rem 0; border: 1px solid var(--muted); border-radius: 1rem; }
button { min-height: 44px; padding: .65rem 1rem; border: 1px solid currentColor; border-radius: .5rem; background: transparent; color: inherit; font: inherit; cursor: pointer; margin: .25rem .5rem .25rem 0; }
button:disabled { opacity: .6; cursor: wait; }
a { color: inherit; text-underline-offset: .2em; }
button:focus-visible, a:focus-visible, summary:focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
.troubleshooting { margin-top: 2rem; }
summary { min-height: 44px; cursor: pointer; }
.installation-id { overflow-wrap: anywhere; }
.fine-print, .installation-id { font-size: .85rem; color: var(--muted); }
</style>
