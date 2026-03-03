<template>
  <div class="glass-panel">
    <div class="content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.glass-panel {
  position: relative;
  overflow: hidden;
  border-radius: var(--glass-radius, 2rem);
  background-color: var(--backgroundAppBase);
}

.content {
  position: relative;
  z-index: 1;
  border-radius: inherit;
}
</style>
