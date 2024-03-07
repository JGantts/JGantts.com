<script setup lang="ts">
import { ref, onMounted, defineProps, } from 'vue';

 </script>

<template>
  <div class="main">
    <slot />
  </div>
</template>

<style scoped>
.main {
  box-shadow: 10px 10px 20px rgba(0, 0, 0, 0.5);
}
</style>