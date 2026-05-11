<script setup lang="ts">
</script>

<template>
    <header class="my-header"><span class="highlight">JGantts</span>.com</header>
    <router-view />
    <footer class="my-footer">© 2026 Jacob Gantt</footer>
</template>

<style>
:root,
.light {
  --bg: var(--blue-5);
  --text: var(--slate-12);
  --muted: var(--slate-11);
  --border: var(--blue-4);
  --accent: var(--tomato-9);
}

.dark {
  --bg: var(--blue-6);
  --text: var(--slate-12);
  --muted: var(--slate-11);
  --border: var(--blue-4);
  --accent: var(--tomato-10);
}

html {
  background-color: var(--bg);
  color: var(--text);
}
</style>

<style scoped>
header {
  text-align: center;
  font-display: block;
}

.highlight {
  color: var(--accent);
}

.my-header {
  font-size: 4em;
}

.my-footer {
  text-align: center;
  color: var(--muted)
}
</style>