<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import Background from './components/Background.vue'
import NavBar from './components/NavBar.vue'
import { ref, onMounted } from 'vue'

import Island from "./components/Island.vue"
import HStack from "./library-jgantts/HStack.vue";
import VStack from "./library-jgantts/VStack.vue";
import ReplayButton from "./components/ReplayButton.vue"
import Links from "./components/Links.vue"

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

document.body.addEventListener('touchstart', (event) => {
  console.log(event)
});

document.body.addEventListener('wheel', (event) => {
  console.log(event)
});

function reloadBackgound() {
  backgroundRef.value?.reloadBackgound()
}

</script>

<template>
  <div id="app">
    <div id="background-holder">
      <div id="wrapper">
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
          <HStack padding="1rem" spacing="1rem">
            <VStack>
              <p id="text03">Contact me about<br />software:</p>
              <p id="text04">Jacob Gantt</p>
              <Links />
            </VStack>
            <p id="text06" style="width: 340px">
              Looking for clients and collaborators.<br />
              I&#039;m a developer with years of professional and personal
              experience; from improving enterprise solutions to fuzz testing
              code parsers; game mods, websites; APIs and UX; C#, JavaScript; Swift, Node;
              I love it all!
            </p>
          </HStack>
        </Island>
        <!-- <NavBar /> -->
        <HStack spacing="0.25rem">
          <ReplayButton style="visibility: hidden" />
          <Island cornerRadius="0.5rem">
            <VStack padding=" 0.25rem 0.75rem">
              <p id="text05">I write software!</p>
              <p id="text07">© 2024 Jacob Gantt</p>
            </VStack>
          </Island>
          <ReplayButton @click="reloadBackgound" />
        </HStack>
      </div>
      <div id="background">
        <Background ref="backgroundRef" />
      </div>
    </div>
  </div>
</template>

<style>
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
