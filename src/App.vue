<template>
  <div id="app">
  		<div id="wrapper">
  			<div id="main">
          <router-view/>
  			</div>
  		</div>
  </div>
</template>

<script setup>
export default {
  name: 'App'
}

</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
