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

<script>
import Background from './components/Background.vue'

export default {
  name: 'App',
  components: {
    Background,
  },
  async created() {
   await new Promise(r => setTimeout(r, 1000));
   document.body.classList.remove("is-loading");
  },
}

</script>

