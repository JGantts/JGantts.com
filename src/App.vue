<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import Background from './components/Background.vue'
</script>

<template>
  <div id="app">
    <div id="background-holder">
      <div id="wrapper">
        <router-view/>
      </div>
      <div id="background">
        <Background></Background>
      </div>
    </div>
  </div>
</template>
