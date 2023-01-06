<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  name: String,
  title: String,
})

</script>


<template>
  <router-link :to="{ name }">
    <div class="main main-nav">
      <div class="inner">
        <p id="text05">{{ title }}</p>
      </div>
    </div>
  </router-link>
</template>