<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import Background from './components/Background.vue'
import NavBar from './components/NavBar.vue'
import { ref, onMounted } from 'vue'

import Island from "./components/Island.vue"
import DStack from "./library-jgantts/DStack.vue";
import HStack from "./library-jgantts/HStack.vue";
import VStack from "./library-jgantts/VStack.vue";
import ReplayButton from "./components/ReplayButton.vue"
import Links from "./components/Links.vue"
import ExpandedView from "./library-jgantts/ExpandedView.vue"
import { Breakpoint } from "./common/Breakpoint"

const backgroundRef = ref(null)

const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)")
darkModePreference.addEventListener("change", checkDarkMode)
checkDarkMode(darkModePreference)

function checkDarkMode(mediaMatch: any) {
  if (mediaMatch.matches){
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }
}

function reloadBackgound() {
  //@ts-expect-error
  backgroundRef.value?.reloadBackgound()
}

</script>

<template>
  <div id="app">
    <div id="box">
      <div id="content">
        <VStack padding="1.25rem" spacing="0.5rem">
          <Island cornerRadius="1.5rem">
            <VStack padding="0.75rem 1.25rem" spacing="0">
              <h1>
                <span id="text01-accent">JGantts</span>
                <span id="text01-dot">.</span>
                <span id="text01">com</span>
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
          <DStack
            :breakpoint="Breakpoint._2_M"
            padding="0"
            hSpacing="1rem"
            vSpacing="1rem"
          >
            <ExpandedView>
              <ReplayButton style="visibility: hidden"/>
            </ExpandedView>
            <Island cornerRadius="0.5rem">
              <VStack padding="0.25rem 0.75rem">
                <p id="text05">I write software!</p>
                <p id="text07">© 2024 Jacob Gantt</p>
              </VStack>
            </Island>
            <ReplayButton @click="reloadBackgound" />
          </DStack>
        </VStack>
      </div>
      <Background id="background" ref="{backgroundRef}" />
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

#background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
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


</style>
