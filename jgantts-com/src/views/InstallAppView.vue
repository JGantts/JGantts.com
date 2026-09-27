<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { standalone } from '@/notifications/client'
const installed = ref(standalone())
function update() { installed.value = standalone() }
onMounted(() => window.addEventListener('pageshow', update))
onBeforeUnmount(() => window.removeEventListener('pageshow', update))
</script>
<template>
  <main class="install-app">
    <img :src="'/app-icons/icon-192.png'" width="80" height="80" alt="JGantts app icon" />
    <h1>JGantts, a tap away.</h1>
    <template v-if="installed">
      <p>You're already using the Home Screen app.</p>
      <p><RouterLink to="/notifications">Manage notifications</RouterLink></p>
    </template>
    <template v-else>
      <p>Keep photographs and stories on your iPhone or iPad Home Screen. The app is free, and notifications are optional.</p>
      <ol>
        <li>Open JGantts.com in Safari. Tap <strong>Share</strong> (the square with an upward arrow). Depending on your version, Share may be in the menu.</li>
        <li>Choose <strong>Add to Home Screen</strong>. If you see <strong>Open as Web App</strong>, leave it on.</li>
        <li>Tap <strong>Add</strong>, then open the <strong>JGantts</strong> icon on your Home Screen.</li>
      </ol>
      <p>Inside the app, choose <strong>Notifications</strong> to opt in to new posts. Installation doesn't grant notification permission.</p>
      <p>If Add to Home Screen isn't available, open this page directly in Safari. On other devices, use your browser's install option if available.</p>
    </template>
    <p class="detail">An internet connection is needed to load photographs and stories. Your browser and Home Screen app may keep separate settings and sign-ins.</p>
    <RouterLink class="done" to="/photos">Done — back to photos</RouterLink>
  </main>
</template>
<style scoped>
.install-app { max-width: 36rem; margin: 2rem auto 4rem; padding: 0 1.5rem; line-height: 1.65; font-size: 1rem; font-weight: 400; }
.install-app img { border-radius: 1rem; }
h1 { font-size: clamp(2rem, 7vw, 3rem); line-height: 1.15; letter-spacing: -.04em; }
p { margin: 1rem 0; }
strong { font-weight: 650; }
ol { padding-left: 1.4rem; list-style: decimal; }
li { padding-left: .5rem; margin: 1rem 0; }
a { color: inherit; text-underline-offset: .2em; }
a:focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
.done { display: inline-block; min-height: 44px; margin-top: 1rem; }
.detail { color: var(--muted); font-size: .9rem; }
</style>
