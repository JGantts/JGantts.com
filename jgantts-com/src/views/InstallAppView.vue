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
    <h1>Add a Home Screen link</h1>
    <template v-if="installed">
      <p>You’re already opening JGantts from your Home Screen.</p>
      <p><RouterLink to="/notifications">Manage notifications</RouterLink></p>
    </template>
    <template v-else>
      <p class="intro">On your iPhone or iPad, open this page in <strong>Safari</strong>.</p>
      <ol class="steps" role="list">
        <li>
          <strong class="step-title">In Safari’s menu, tap Share
            <svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V2m-4 4 4-4 4 4M7 10H4v11h16V10h-3" /></svg>
          </strong>
          <span>Or tap the Share icon in Safari’s toolbar.</span>
        </li>
        <li>
          <strong class="step-title">Tap Add to Home Screen</strong>
          <span>Scroll down the Share menu to find it.</span>
        </li>
        <li>
          <strong class="step-title">Tap Add</strong>
          <span>If <strong>Open as Web App</strong> appears, leave it on.</span>
        </li>
        <li>
          <strong class="step-title">Open JGantts from your Home Screen</strong>
          <span>Tap the new JGantts icon. For alerts, choose <strong>Notifications</strong> there.</span>
        </li>
      </ol>
    </template>
    <RouterLink class="done" to="/photos">Back to photos</RouterLink>
  </main>
</template>
<style scoped>
.install-app { box-sizing: border-box; width: min(36rem, 100%); margin: 2rem auto 4rem; padding: 0 1.5rem; line-height: 1.65; font-size: 1rem; font-weight: 400; }
.install-app img { border-radius: 1rem; }
h1 { font-size: clamp(2rem, 7vw, 3rem); line-height: 1.15; letter-spacing: -.04em; }
p { margin: 1rem 0; }
strong { font-weight: 650; }
.steps { padding: 0; margin: 1.5rem 0; list-style: none; counter-reset: steps; }
.steps li { counter-increment: steps; position: relative; padding: 1rem 1rem 1rem 3.5rem; margin: .75rem 0; border: 1px solid var(--muted); border-radius: .75rem; }
.steps li::before { content: counter(steps); position: absolute; left: 1rem; top: 1rem; width: 1.7rem; height: 1.7rem; border-radius: 50%; background: var(--text); color: var(--page-bg, var(--bg)); text-align: center; line-height: 1.7rem; font-weight: 650; }
.step-title { display: block; line-height: 1.4; }
.steps li > span { display: block; margin-top: .35rem; font-size: .85rem; }
.share-icon { display: inline-block; vertical-align: -.15em; width: 1.1em; height: 1.1em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
a { color: inherit; text-underline-offset: .2em; }
a:focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
.done { display: inline-block; min-height: 44px; margin-top: 1rem; }

</style>
