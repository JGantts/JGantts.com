@ -1,82 +0,0 @@
<script setup lang="ts">

</script>

<template>
  <div class="i-am">
    <p class="who">
      Hi, I'm Jacob, a
      programmer
      who loves
      what he does.
    </p>
    <p class="where">
      I'm from northeast Tennessee, USA.
    </p>
  </div>
</template>

<style scoped>
.i-am {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.who {
  max-width: 9rem;
}

.where {
  max-width: 100rem;
}

@media (min-width: 1025px) {
  #text06 {
    max-width: 400px;
  }
}

.inline-img {
  margin: 0.125rem;
  border-radius: 0.5rem;
}

</style>