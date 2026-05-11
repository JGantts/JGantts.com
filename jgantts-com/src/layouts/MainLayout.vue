<script setup lang="ts">
</script>

<template>
  <div class="main">
    <header class="my-header"><span class="highlight">JGantts</span>.com</header>
    <router-view />
    <footer class="my-footer">
      <p>email: <span class="email">contact@jgantts.com</span></p>
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

.highlight {
  color: var(--accent);
}
</style>

<style scoped>
.main {
  display: flex;
  flex-direction: column;
}

.my-header {
  margin: 2rem;

  font-size: 3em;
  text-align: center;
  font-display: block;
  font-weight: 400;
}

.my-footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  margin: 1rem;

  text-align: center;
  color: var(--muted);

  user-select: none;
}

.email {
  user-select: text;
}

.copyright {
  font-size: 0.8rem;
}
</style>