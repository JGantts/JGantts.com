<script setup lang="ts">
</script>

<template>
  <div class="main">
    <header class="my-header"><span class="my-header-highlight">JGantts</span>.com</header>
    <router-view />
    <footer class="my-footer">
      <p class="email">contact@jgantts.com</p>
      <p class="copyright">
      © 2026 Jacob Gantt
      </p>
    </footer>
  </div>
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
.main {
  display: flex;
  flex-direction: column;
}

.my-header {
  margin: 2rem;
  margin-bottom: 1rem;

  font-size: 3em;
  text-align: center;
  font-display: block;
  font-weight: 400;
}

.my-header-highlight {
  color: var(--accent);
}

.my-footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  margin: 1rem;

  text-align: center;
  color: var(--muted);
}


.copyright {
  font-size: 0.8rem;
}
</style>