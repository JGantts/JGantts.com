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

import { setCSSColors } from './Curtain/ThemeHandler'
import { Breakpoint } from "./common/Breakpoint"
import {
  theme_BlueDark_slate__Tomato_mauve,
  theme_Blue_slate__Orange_sand,
} from './Curtain/Themes'
import { BackgroundState } from './Curtain/Types';

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
  setCSSColors(mediaMatch.matches ? theme_BlueDark_slate__Tomato_mauve : theme_Blue_slate__Orange_sand)
}

async function pausePlay() {
  runningSecondary.value = true
  //@ts-expect-error
  let newState = await backgroundRef.value?.pausePlay()
  //@ts-expect-error
  replayButtonRef.value.state = newState
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
        <VStack padding="1.25rem" spacing="0.5rem">          
          <Island cornerRadius="1.5rem">
            <VStack padding="0.75rem 1.25rem" spacing="0">
              <h1>
                <span class="text01 highlight" :class="{ mellow: runningSecondary }">JGantts</span>
                <span class="text01">.com</span>
              </h1>
              <p id="text02">Welcome, all.</p>
            </VStack>
          </Island>
          <Island cornerRadius="1.5rem">
            <DStack
              :breakpoint="Breakpoint._2_M"
              padding="1rem"
              hSpacing="1rem"
              vSpacing="1rem"
            >
              <VStack>
                <p id="text03">Contact me about<br />software:</p>
                <p id="text04">Jacob Gantt</p>
                <Links />
              </VStack>
              <p id="text06" style="max-width: 340px">
                Looking for clients and collaborators.<br />
                I&#039;m a developer with years of professional and personal
                experience; from improving enterprise solutions to fuzz testing
                code parsers; game mods, websites; APIs and UX; C#, JavaScript;
                Swift, Node; I love it all!
              </p>
            </DStack>
          </Island>
          <!-- <NavBar /> -->
          <div id="replay-holder">
            <div style="width: 2rem" />
            <Island id="replay-sibling" cornerRadius="0.5rem">
              <VStack padding="0.25rem 0.75rem">
                <p class="text05 highlight" :class="{ mellow: runningSecondary }">I write software!</p>
                <p id="text07">© 2024 Jacob Gantt</p>
              </VStack>
            </Island>
            <div style="width: 2rem">
              <ReplayButton class="replay-button" @click="pausePlay" :state="BackgroundState.First" ref="replayButtonRef"/>
            </div>
          </div>
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
  text-align: justify;
  font-size: 0.625em;
  line-height: 1.5;
  font-weight: 400;
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

</style>

<style scoped>
.highlight {
  color: var(--textAccentOnBase);
}

/* Apply the animation to the text element */
.mellow {
  color: var(--textBaseOnAccentLowContrast);
  transition: color 3s ease-in-out 1.5s;
}
</style>