<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { AdminApiError, adminRequest, createAdminSession, deleteAdminSession, jsonRequest } from '@/admin/api'
import type { NotificationDashboard } from '@/admin/notifications'

const data = ref<NotificationDashboard>()
const needsLogin = ref(false)
const token = ref('')
const error = ref('')
const notice = ref('')
const busy = ref(false)
const refreshing = ref(false)
const autoRefresh = ref(true)
const installationId = ref('')
const kind = ref('all')
const deliveryState = ref('all')
let disposed = false
let timer: ReturnType<typeof setInterval> | undefined
const deliveries = computed(() => data.value?.recentDeliveries.filter(row =>
  (kind.value === 'all' || row.kind === kind.value) && (deliveryState.value === 'all' || row.state === deliveryState.value)) ?? [])
const eligible = computed(() => data.value?.installations.filter(item => item.active && item.allowed) ?? [])
const canSend = computed(() => data.value?.sendEnabled && eligible.value.some(item => item.id === installationId.value))
const count = (state: string) => data.value?.deliveries.find(item => item.state === state)?.count ?? 0
const date = (value: number) => value ? new Date(value).toLocaleString() : 'Historical publication'
const duration = (ms: number) => ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`
function report(cause: unknown) {
  if (cause instanceof AdminApiError && cause.status === 401) { needsLogin.value = true; data.value = undefined }
  error.value = cause instanceof Error ? cause.message : 'Could not load notifications.'
}
async function refresh() {
  if (refreshing.value || disposed) return
  refreshing.value = true
  try {
    const result = await adminRequest<NotificationDashboard>('/api/admin/push/dashboard', { cache: 'no-store' })
    if (disposed) return
    data.value = result; needsLogin.value = false; error.value = ''
  } catch (cause) { if (!disposed) report(cause) }
  finally { refreshing.value = false }
}
async function login() {
  busy.value = true; error.value = ''
  try { await createAdminSession(token.value.trim()); token.value = ''; await refresh() }
  catch (cause) { report(cause) }
  finally { busy.value = false }
}
async function logout() {
  busy.value = true
  try { await deleteAdminSession(); data.value = undefined; needsLogin.value = true; notice.value = ''; installationId.value = '' }
  catch (cause) { report(cause) }
  finally { busy.value = false }
}
async function sendTest() {
  if (!canSend.value || busy.value) return
  busy.value = true; notice.value = ''; error.value = ''
  try {
    const result = await adminRequest<{ eventId: string }>('/api/admin/push/test', jsonRequest('POST', { subscriptionId: installationId.value }))
    notice.value = `Test queued. Event ${result.eventId}. Check its provider status below.`
    await refresh()
  } catch (cause) { report(cause) }
  finally { busy.value = false }
}
onMounted(() => {
  void refresh()
  timer = setInterval(() => { if (autoRefresh.value && data.value && !busy.value && document.visibilityState === 'visible') void refresh() }, 5000)
})
onBeforeUnmount(() => { disposed = true; clearInterval(timer) })
</script>

<template>
  <main class="notification-admin">
    <header>
      <div><p class="eyebrow">Site administration</p><h1>Notifications</h1><p>Follow a post from publication to push provider acceptance.</p></div>
      <nav aria-label="Admin"><RouterLink to="/admin/posts">Post editor</RouterLink><button v-if="data" :disabled="busy || refreshing" @click="logout">Log out</button></nav>
    </header>
    <p v-if="error" role="alert" class="alert">{{ error }} <button v-if="!needsLogin" :disabled="refreshing" @click="refresh">Retry</button></p>
    <section v-if="needsLogin" class="card login">
      <h2>Sign in to notifications</h2><p>Use your admin token. Your session is shared with the post editor.</p>
      <form @submit.prevent="login"><label for="admin-token">Admin token</label><input id="admin-token" v-model="token" type="password" autocomplete="off" required><button :disabled="busy || refreshing || !token.trim()">Sign in</button></form>
    </section>
    <p v-else-if="!data && !error" role="status">Loading notification dashboard…</p>
    <template v-if="data">
      <div class="controls"><button :disabled="refreshing || busy" @click="refresh">{{ refreshing ? 'Refreshing…' : 'Refresh now' }}</button><label><input v-model="autoRefresh" type="checkbox"> Refresh every 5 seconds</label><span class="muted">Updated {{ date(data.capturedAt) }}</span></div>
      <p v-if="error" class="muted">Showing the last successful snapshot.</p>
      <div class="metrics">
        <section class="card"><span>Active installations</span><strong>{{ data.activeSubscriptions }}</strong></section>
        <section class="card"><span>Preparing deliveries</span><strong>{{ data.pendingEvents }}</strong></section>
        <section class="card"><span>Waiting / sending</span><strong>{{ count('pending') + count('processing') }}</strong></section>
        <section class="card"><span>Retrying / failed</span><strong>{{ data.retryingDeliveries }} / {{ count('failed') }}</strong></section>
      </div>
      <section class="card">
        <h2>Delivery controls</h2>
        <p>Enrollment <b>{{ data.enabled ? 'on' : 'off' }}</b> · Sending <b>{{ data.sendEnabled ? 'on' : 'off' }}</b> · Audience <b>{{ data.audience === '*' ? 'all subscribers' : data.audience.length ? `${data.audience.length} selected installations` : 'nobody' }}</b></p>
        <p v-if="!data.sendEnabled || data.audience !== '*' && !data.audience.length" class="alert">Delivery is paused by server configuration. Queued notifications may expire before sending resumes.</p>
        <p v-if="!data.enabled">New subscriptions and publication notifications are disabled. Publications made while enrollment is off are not sent later.</p>
        <p>Oldest waiting event: {{ data.oldestPendingAgeSeconds }} seconds. Provider acceptance means the push service received it; it does not confirm that the phone displayed it.</p>
        <details v-if="data.audience !== '*' && data.audience.length"><summary>Allowed installation IDs</summary><ul><li v-for="id in data.audience" :key="id"><code>{{ id }}</code></li></ul></details>
      </section>
      <section class="card">
        <h2>Test one installation</h2><p>Match the ID under Troubleshooting in that device’s notification settings. Only active installations in the configured audience are selectable.</p>
        <form class="test-form" @submit.prevent="sendTest"><label for="installation">Installation</label><select id="installation" v-model="installationId"><option value="">Choose an installation</option><option v-for="item in eligible" :key="item.id" :value="item.id">{{ item.id }}</option></select><button :disabled="busy || refreshing || !canSend">Send test notification</button></form>
        <p v-if="!eligible.length" class="muted">No eligible installations in the latest 100 registrations.</p><p role="status" class="notice">{{ notice }}</p>
      </section>
      <section class="card">
        <h2>Recent publication events</h2><p class="muted">Latest 50 events, including tests and suppressed publications. Editing or republishing a post does not send it again. Scroll the table to see every column.</p>
        <p v-if="!data.events.length">No notification events yet.</p>
        <div v-else class="table-scroll" tabindex="0" role="region" aria-label="Recent events"><table><thead><tr><th>Post / event</th><th>Queued</th><th>Queue state</th><th>Provider accepted</th><th>Waiting</th><th>Failed / cancelled</th></tr></thead><tbody>
          <tr v-for="event in data.events" :key="event.id"><td><b>{{ event.kind === 'test' ? 'Test notification' : event.title || 'Untitled post' }}</b><code>{{ event.id }}</code></td><td>{{ date(event.createdAt) }}</td><td>{{ event.state === 'expanded' ? 'Recipients queued' : event.state === 'pending' ? 'Preparing deliveries' : event.state }}<small v-if="event.state === 'expanded' && !event.total">No retained deliveries</small></td><td>{{ event.accepted }} / {{ event.total }}</td><td>{{ event.waiting }}</td><td>{{ event.failed }} / {{ event.cancelled }}</td></tr>
        </tbody></table></div>
      </section>
      <section class="card">
        <h2>Recent deliveries</h2><div class="controls"><label>Type <select v-model="kind" aria-label="Type"><option value="all">All</option><option value="publication">Posts</option><option value="test">Tests</option></select></label><label>Status <select v-model="deliveryState" aria-label="Status"><option value="all">All</option><option value="accepted">Provider accepted</option><option value="pending">Pending</option><option value="processing">Sending</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option></select></label></div>
        <p class="muted">Filters apply to the latest 100 updated deliveries. Timing runs from event creation to provider acceptance. Scroll the table to see every column.</p>
        <p v-if="!deliveries.length">No deliveries match these filters.</p>
        <div v-else class="table-scroll" tabindex="0" role="region" aria-label="Recent deliveries"><table><thead><tr><th>Post / installation</th><th>Status</th><th>Attempts</th><th>Provider response</th><th>Accepted after</th><th>Last activity / retry</th></tr></thead><tbody>
          <tr v-for="row in deliveries" :key="row.id"><td><b>{{ row.kind === 'test' ? 'Test notification' : row.title || 'Untitled post' }}</b><code>{{ row.installationId }}</code><small>Event {{ row.eventId }}</small></td><td>{{ row.state === 'accepted' ? 'Provider accepted' : row.state === 'processing' ? 'Sending' : row.state }}</td><td>{{ row.attempts }}</td><td>{{ row.lastStatus ?? (row.attempts && row.state !== 'processing' ? 'No HTTP response' : '—') }}</td><td>{{ row.acceptedAfterMs === null ? '—' : duration(row.acceptedAfterMs) }}</td><td>{{ date(row.updatedAt) }}<small v-if="row.state === 'pending' && row.attempts">Retry after {{ date(row.availableAt) }}</small></td></tr>
        </tbody></table></div>
      </section>
      <section class="card"><h2>Installations</h2><p class="muted">Latest 100 registrations, active first. Device names are not collected.</p><p v-if="!data.installations.length">No installations registered yet.</p><ul class="installations"><li v-for="item in data.installations" :key="item.id"><code>{{ item.id }}</code><span>{{ item.active ? 'Active' : 'Revoked' }} · {{ item.allowed ? 'In audience' : 'Outside audience' }}</span><small>Last seen {{ date(item.lastSeenAt) }}</small></li></ul></section>
    </template>
  </main>
</template>

<style scoped>
.notification-admin { width: 100%; min-width: 0; box-sizing: border-box; max-width: 1180px; margin: 2rem auto 4rem; padding: 0 1.25rem; font-size: 1rem; font-weight: 400; line-height: 1.5; }
header, nav, .controls { display: flex; align-items: center; flex-wrap: wrap; gap: 1rem; }
header { justify-content: space-between; margin-bottom: 1.5rem; } h1 { font-size: clamp(2rem, 6vw, 3rem); margin: 0; } h2 { font-size: 1.2rem; margin-top: 0; }
.eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: .75rem; } .muted, small { color: var(--muted); } a { color: inherit; }
.card { padding: 1.25rem; border: 1px solid var(--muted); border-radius: .75rem; margin: 1rem 0; min-width: 0; }
.metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; } .metrics strong { display: block; font-size: 2rem; } .metrics .card { margin-bottom: 0; }
button, input:not([type=checkbox]), select { min-height: 44px; padding: .6rem; border: 1px solid var(--muted); border-radius: .35rem; color: inherit; background: var(--background, transparent); font: inherit; box-sizing: border-box; max-width: 100%; }
button, summary { cursor: pointer; } button:disabled { opacity: .5; cursor: default; } button:focus-visible, input:focus-visible, select:focus-visible, a:focus-visible, summary:focus-visible, .table-scroll:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
form { display: grid; gap: .6rem; justify-items: start; } .login { max-width: 32rem; } .test-form select { width: min(100%, 29rem); }
.table-scroll { overflow-x: auto; } table { border-collapse: collapse; width: 100%; text-align: left; font-size: .85rem; } th, td { padding: .8rem; border-bottom: 1px solid var(--muted); vertical-align: top; } th { white-space: nowrap; } td { min-width: 7rem; } td:first-child { min-width: 15rem; max-width: 24rem; }
code, small { display: block; overflow-wrap: anywhere; } code { font-size: .8rem; } .alert { border-left: 3px solid currentColor; padding-left: .8rem; } .notice { overflow-wrap: anywhere; }
.installations { list-style: none; padding: 0; } .installations li { padding: .75rem 0; border-bottom: 1px solid var(--muted); } summary { min-height: 44px; }
@media (max-width: 700px) { .metrics { grid-template-columns: repeat(2, 1fr); gap: .5rem; } .card { padding: 1rem; } .controls { align-items: flex-start; } }
</style>
