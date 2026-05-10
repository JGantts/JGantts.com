<script setup lang="ts">
import { ref } from 'vue'

import VStack from "@/library-jgantts/VStack.vue"
import Background from "@/components/Background.vue"

const runningSecondary = ref(false)
</script>

<template>
  <div id="app">
    <div id="box">
      <div class="content-scrim" />
      <div id="content">
        <VStack class="page-shell" padding="1.5rem" spacing="1.5rem">
          <header class="site-header">
            <p class="brand-mark text-h2">
              <span class="highlight" :class="{ mellow: runningSecondary }">JGantts</span>
              <span>.com</span>
            </p>
            <p class="site-status">Nothing to see here. Move along please.</p>
          </header>

          <main class="page-main">
            <router-view v-slot="{ Component }">
              <transition
                name="fade"
                mode="out-in"
              >
                <component :is="Component" :key="$route.path" />
              </transition>
            </router-view>
          </main>

          <footer class="site-footer">
            <p class="footer-meta">© 2026 Jacob Gantt</p>
          </footer>
        </VStack>
      </div>
      <Background />
    </div>
  </div>
</template>

<style>
#app {
  top: 0;
  left: 0;
  right: 0;
  min-height: 100vh;
  min-height: 100dvh;
  min-width: 100vw;
  display: block;
  overflow: visible;
}

#box {
  position: relative;
  width: 100%;
  max-width: 100vw;
  min-height: 100vh;
  z-index: 2;
  overflow: visible;
}

.content-scrim {
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(6, 23, 49, 0.7), rgba(6, 23, 49, 0.62));
}

@media (prefers-color-scheme: light) {
  .content-scrim {
    background:
      linear-gradient(180deg, rgba(214, 228, 244, 0.42), rgba(214, 228, 244, 0.32));
  }

  .brand-mark,
  .site-status,
  .footer-link {
    color: rgba(52, 66, 82, 0.9) !important;
  }

  .mellow {
    color: rgba(90, 104, 120, 0.78);
  }
}

#content {
  position: relative;
  width: 100%;
  max-width: 100vw;
  z-index: 4;
}

.page-shell {
  width: min(100%, 70rem);
  margin: 0 auto;
  justify-content: flex-start;
}

.site-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  text-align: center;
}

.brand-mark,
.site-tagline,
.site-status,
.footer-meta {
  margin: 0;
}

.brand-mark {
  color: rgba(236, 241, 246, 0.94);
  font-size: clamp(2.2rem, 4.6vw, 4.1rem) !important;
  line-height: 0.95;
}

.site-tagline {
  font-size: 1rem;
  line-height: 1.35;
}

.site-status {
  font-size: 0.95rem;
  line-height: 1.35;
  letter-spacing: 0.01em;
  text-transform: none;
  color: rgba(214, 223, 232, 0.78);
}

.page-main {
  display: block;
}

.site-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem 1rem;
  margin-top: 1.5rem;
  padding-top: 0.75rem;
}

.footer-meta {
  font-size: 0.9rem;
  line-height: 1.3;
}

</style>

<style scoped>
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.fade-enter-to, .fade-leave-from {
  opacity: 1;
}

.fade-leave-active {
  transition: opacity 0.2s ease-in 0s;
  color: rgba(0, 0, 0, 0);
}

.fade-enter-active {
  transition: opacity 0.2s ease-out 0s;
  color: rgba(0, 0, 0, 0);
}

@media (max-width: 700px) {
  .page-shell {
    padding: 1.1rem !important;
  }

  .site-footer {
    align-items: center;
    flex-direction: column;
  }

  .page-main {
    align-items: flex-start;
  }
}
</style>
