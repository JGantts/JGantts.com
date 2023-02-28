<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import Background from './components/Background.vue'
import NavBar from './components/NavBar.vue'

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
</script>

<template>
  <div id="app">
    <div id="background-holder">
      <div id="wrapper">
        <div id="main01" class="main">
          <div class="inner">
            <div id="container01" class="container default full">
              <div class="wrapper">
                <div class="inner">
                  <h1 id="text-title">JGantts.com</h1>
                  <p id="text-subtitle">Welcome, all.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <NavBar />
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
        <div id="main03" class="main">
          <div class="inner">
            <div id="container03" class="container default full">
              <div class="wrapper">
                <div class="inner">
                  <p id="text05">I write software!</p>
                  <p id="text07">© 2023 Jacob Gantt</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="background">
        <Background></Background>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
#text-title {
  font-size: 2em;
  line-height: 1.5;
  font-weight: 500;
}

#text-subtitle {
  font-size: 1em;
  line-height: 1.5;
  font-weight: 300;
}

#text-footer-title {
  font-size: 1em;
  line-height: 1.5;
  font-weight: 500;
}

#text-footer-copywrite {
  font-size: 0.5em;
  line-height: 1.5;
  font-weight: 300;
}

body {
  background-color: var(--base3);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s ease;
  overflow: hidden;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  max-height: 1rem;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  max-height: 150vh;
}

.main {
  background-color: var(--backgroundAppBase);
}

@media (max-width: 736px) {
#text-title {
  font-size: 1.875em;
  line-height: 1.5;
  font-weight: 500;
}

#text-subtitle {
  font-size: 1em;
  line-height: 1.5;
  font-weight: 300;
}

#container-nav > .wrapper > .inner > ul {
  flex-direction: column; 
}
}

@media (max-width: 480px) {
#container-nav > .wrapper > .inner > ul {
  flex-direction: column; 
}
}

@media (max-width: 360px) {
#container-nav > .wrapper > .inner > ul {
  flex-direction: column; 
}
}

#main01 {
  --alignment: center;
  --flex-alignment: center;
  --indent-left: 1;
  --indent-right: 1;
  --border-radius-tl: 1.5rem;
  --border-radius-tr: 1.5rem;
  --border-radius-br: 1.5rem;
  --border-radius-bl: 1.5rem;
  align-items: center;
  display: flex;
  flex-grow: 0;
  flex-shrink: 0;
  justify-content: center;
  max-width: 100%;
  position: relative;
  text-align: var(--alignment);
  z-index: 1;
  border-radius: var(--border-radius-tl) var(--border-radius-tr) var(--border-radius-br) var(--border-radius-bl);
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
#text05 {
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

#main01 > .inner {
  border-radius: var(--border-radius-tl) var(--border-radius-tr) var(--border-radius-br) var(--border-radius-bl);
  max-width: 100%;
  position: relative;
  width: var(--width);
  z-index: 1;
  padding: var(--padding-vertical) var(--padding-horizontal);
}

#main01 > .inner > * {
  margin-top: var(--spacing);
  margin-bottom: var(--spacing);
}

#main01 > .inner > :first-child {
  margin-top: 0 !important;
}

#main01 > .inner > :last-child {
  margin-bottom: 0 !important;
}

#main01 > .inner > .full {
  margin-left: calc(var(--padding-horizontal) * -1);
  max-width: calc(100% + calc(var(--padding-horizontal) * 2) + 0.4725px);
  width: calc(100% + calc(var(--padding-horizontal) * 2) + 0.4725px);
}

#main01 > .inner > .full:first-child {
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
  margin-top: calc(var(--padding-vertical) * -1) !important;
}

#main01 > .inner > .full:last-child {
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
  margin-bottom: calc(var(--padding-vertical) * -1) !important;
}

#main01 > .inner > .full.screen {
  border-radius: 0 !important;
  max-width: 100vw;
  position: relative;
  width: 100vw;
  left: 50%;
  margin-left: -50vw;
  right: auto;
}

#main01 > .inner {
  --padding-horizontal: 0;
  --padding-vertical: -0.5rem;
  --spacing: 0rem;
  --width: 15rem;
}

@media (max-width: 736px) {
  #main01 > .inner {
    --padding-horizontal: 0;
    --padding-vertical: -0.5rem;
    --spacing: 0rem;
  }
}

@media (max-width: 480px) {
  #main01 > .inner {
    --spacing: 0rem;
  }
}

@media (max-width: 360px) {
  #main01 > .inner {
    --padding-horizontal: 0;
    --padding-vertical: -0.5rem;
    --spacing: 0rem;
  }
}

#main03 {
  --alignment: center;
  --flex-alignment: center;
  --indent-left: 1;
  --indent-right: 1;
  --border-radius-tl: 0.5rem;
  --border-radius-tr: 0.5rem;
  --border-radius-br: 0.5rem;
  --border-radius-bl: 0.5rem;
  align-items: center;
  display: flex;
  flex-grow: 0;
  flex-shrink: 0;
  justify-content: center;
  max-width: 100%;
  position: relative;
  text-align: var(--alignment);
  z-index: 1;
  border-radius: var(--border-radius-tl) var(--border-radius-tr) var(--border-radius-br) var(--border-radius-bl);
}

#main03 > .inner {
  border-radius: var(--border-radius-tl) var(--border-radius-tr) var(--border-radius-br) var(--border-radius-bl);
  max-width: 100%;
  position: relative;
  width: var(--width);
  z-index: 1;
  padding: var(--padding-vertical) var(--padding-horizontal);
}

#main03 > .inner > * {
  margin-top: var(--spacing);
  margin-bottom: var(--spacing);
}

#main03 > .inner > :first-child {
  margin-top: 0 !important;
}

#main03 > .inner > :last-child {
  margin-bottom: 0 !important;
}

#main03 > .inner > .full {
  margin-left: calc(var(--padding-horizontal) * -1);
  max-width: calc(100% + calc(var(--padding-horizontal) * 2) + 0.4725px);
  width: calc(100% + calc(var(--padding-horizontal) * 2) + 0.4725px);
}

#main03 > .inner > .full:first-child {
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
  margin-top: calc(var(--padding-vertical) * -1) !important;
}

#main03 > .inner > .full:last-child {
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
  margin-bottom: calc(var(--padding-vertical) * -1) !important;
}

#main03 > .inner > .full.screen {
  border-radius: 0 !important;
  max-width: 100vw;
  position: relative;
  width: 100vw;
  left: 50%;
  margin-left: -50vw;
  right: auto;
}

#main03 > .inner {
  --padding-horizontal: 0;
  --padding-vertical: 0;
  --spacing: 0rem;
  --width: 9rem;
}

@media (max-width: 736px) {
  #main03 > .inner {
    --padding-horizontal: 0;
    --padding-vertical: 0;
    --spacing: 0rem;
    --width: 11rem;
  }
}

@media (max-width: 480px) {
  #main03 > .inner {
    --spacing: 0rem;
    --width: 11rem;
  }
}

@media (max-width: 360px) {
  #main03 > .inner {
    --padding-horizontal: 0;
    --padding-vertical: 0;
    --spacing: 0rem;
    --width: 11rem;
  }
}
</style>