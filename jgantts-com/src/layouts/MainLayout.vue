<script setup lang="ts">
import { ref } from 'vue'

import Island from "@/components/Island.vue"
import VStack from "@/library-jgantts/VStack.vue"
import Background from "@/components/Background.vue"
import NavBar from '@/components/NavBar.vue'

import EnvelopeIcon from '@/assets/icons/envelope.svg'

const runningSecondary = ref(false)
</script>

<template>
  <div id="app">
    <div id="box">
      <div id="content">
        <VStack padding="1.25rem" spacing="1.5rem">
          <Island id="welcome-island" cornerRadius="2.5rem">
            <VStack class="text-h3" padding="0.75rem 1.25rem" spacing="0">
              <h1>
                <span class="highlight" :class="{ mellow: runningSecondary }">JGantts</span>
                <span>.com</span>
              </h1>
            </VStack>
          </Island>
          <NavBar />
          <router-view v-slot="{ Component }">
            <transition
              name="fade"
              mode="out-in"
            >
              <component :is="Component" :ket="$route.path" />
            </transition>
          </router-view>
          <div class="contact-wrap">
            <Island id="replay-sibling" cornerRadius="2rem">
              <VStack class="text-h4" padding="0.5rem 1rem" spacing="0.3rem">
                <a href="mailto:contact@jgantts.com" class="link">
                  <span class="line">
                    <div class="link-icon" :class="{ mellow: runningSecondary }" >
                      <EnvelopeIcon class="fa-icon" />
                    </div>
                    <span class="link-space">&nbsp;&nbsp;</span>
                    <span class="underline link">contact@jgantts.com</span>
                  </span>
                </a>
                <p class="text-subtitle-1">© 2026 Jacob Gantt</p>
              </VStack>
            </Island>
          </div>
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
  min-width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

#box {
  position: relative;
  width: 100%;
  max-width: 100vw;
  min-height: 100vh;
  z-index: 2;
  overflow: visible;
}

#content {
  position: relative;
  max-width: 100vw;
  max-height: 100vh;
  z-index: 3;
}

.main {
  background-color: var(--backgroundAppBase);
}

.link {
  text-decoration: none;
}

.main-holder {
  --alignment: center;
  --flex-alignment: center;
}

#replay-holder {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

#replay-sibling {
  width: min(100%, 32rem);
  text-align: center;
}

.contact-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
}

.replay-button {
  width: 1em;
}

.text01-accent {
  color: var(--textAccentOnBase);
  font-size: 2em;
  line-height: 1.5;
  font-weight: 500;
}

.text01 {
  font-size: 2em;
  line-height: 1.5;
  font-weight: 500;
}

#text02 {
  font-size: 1em;
  line-height: 1.5;
  font-weight: 300;
}

#text03 {
  color: var(--textGrayOnBaseLowContrast);
  font-size: 0.625em;
  line-height: 1.5;
  font-weight: 300;
}

#text04 {
  font-size: 1em;
  line-height: 1.5;
  font-weight: 400;
}

.text05 {
  font-size: 1em;
  line-height: 1.5;
  font-weight: 500;
}

#text06 {
  text-align: start;
  font-size: 0.625em;
  line-height: 1.5;
  font-weight: 400;
}

#text06>p {
  padding-bottom: 0.25em;
}

#text07 {
  font-size: 0.5em;
  line-height: 1.5;
  font-weight: 300;
}

#text07-accent {
  font-size: 0.5em;
  line-height: 1.5;
  font-weight: 400;
}

.mellow {
  color: var(--textBaseOnAccentLowContrast);
  transition: color 3s ease-in-out 1.5s;
}

.line {
  display: flex;
  justify-content: center;
  align-items: center;
  text-decoration: none;
}

.link-icon {
  color: var(--textAccentOnBase);
}

@media (max-width: 450px) {
  .link-icon {
    display: none;
  }

  .link-space {
    display: none;
  }

  .link {
    color: var(--textAccentOnBase);
  }
}

.link {
  cursor: pointer;
  white-space: nowrap;
}
</style>

<style scoped>
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  max-height: 0;
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
  max-height: 100vh;
}

.fade-leave-active {
  transition: opacity 0.2s ease-in 0s, max-height 0.4s ease-out;
  color: rgba(0, 0, 0, 0);
}
.fade-enter-active {
  transition: opacity 0.2s ease-out calc(0.4s - 0.2s), max-height 0.4s ease-in;
  color: rgba(0, 0, 0, 0);
}
</style>

<style scoped>
a {
  text-decoration: none;
}
a .underline {
  text-decoration: underline;
}
a:hover {
  text-decoration: none;
}
a:hover .link, a:hover .link-icon {
  color: var(--textAccentOnBase);
}
</style>
