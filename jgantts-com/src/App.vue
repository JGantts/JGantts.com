<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { ref, onMounted } from 'vue'

import Island from "./components/Island.vue"
import DStack from "./library-jgantts/DStack.vue";
import HStack from "./library-jgantts/HStack.vue";
import VStack from "./library-jgantts/VStack.vue";
import ReplayButton from "./components/ReplayButton.vue"
import Links from "./components/Links.vue"
import ExpandedView from "./library-jgantts/ExpandedView.vue"
import Background from "./components/Background.vue"
import NavBar from './components/NavBar.vue';

import { setCSSColors } from './Curtain/ThemeHandler'
import { Breakpoint } from "./common/Breakpoint"
import {
  theme_dark,
  theme_light,
} from './Curtain/Themes'
import { BackgroundState } from './Curtain/Types';


  import EnvelopeIcon from './assets/icons/envelope.svg'

const sleep = (ms: number|undefined) => {
  return new Promise(resolve => setTimeout(resolve, ms || 2000));
}

const backgroundRef = ref(null)
const replayButtonRef = ref(null)

const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)")
darkModePreference.addEventListener("change", checkDarkMode)
checkDarkMode(darkModePreference)

function checkDarkMode(mediaMatch: any) {
  if (mediaMatch.matches){
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }
  setCSSColors(mediaMatch.matches ? theme_dark : theme_light)
}

async function pausePlay() {
  runningSecondary.value = true
  //@ts-expect-error
  replayButtonRef.value.backgroundState = BackgroundState.AfterFirstLoading
  //await sleep(2500)
  //@ts-expect-error
  replayButtonRef.value.backgroundState = await backgroundRef.value?.pausePlay()
}

const runningSecondary = ref(false)

function firstRunDone() {
  //@ts-expect-error
  replayButtonRef.value?.firstRunDone()
}

onMounted(() => {
})
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
          <DStack :breakpoint="Breakpoint._2_M" vSpacing="1rem" hSpacing="1rem">
            <div style="width: 2rem" />
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
                <p class="text-subtitle-1">© 2025 Jacob Gantt</p>
              </VStack>
            </Island>
            <div style="width: 2rem">
              <!--
              <ReplayButton class="text-h4 replay-button" @click="pausePlay" :state="BackgroundState.First" ref="replayButtonRef"/>
              -->
            </div>
          </DStack>
        </VStack>
      </div>
      <Background ref="backgroundRef" @first-run-done="firstRunDone"/>
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
  align-items: center; /* To vertically center the items */
  gap: 0.5rem;
}

#replay-sibling {
  flex-grow: 1; /* Allow the sibling to grow and take up available space */
  text-align: center; /* Center the content of the sibling */
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


.highlight {
  color: var(--textAccentOnBase);
}

.heavy {
  font-weight: 800;
}

.bold {
  font-weight: 600;
}

.light {
  font-weight: 100;
}

.large {
  font-size: 0.9rem;
}

.medium {
  font-size: 0.8rem;
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

<style>
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