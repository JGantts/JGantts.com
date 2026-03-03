<script setup lang="ts">
import Island from "../components/Island.vue"
</script>

<template>
  <Island class="hero-card" cornerRadius="3rem">
    <div class="hero-content">
      <div class="hero-intro text-h4">
        <p>
          Hi, I'm<br />
          <span class="highlight">Jacob.</span>
        </p>
        <p>
          I build<br />
          <span class="highlight">production-ready</span><br />
          software.
        </p>
      </div>
      <div class="hero-copy">
        <p class="hero-support text-h5">
          Systems, tooling, and full-stack applications &mdash;<br />
          <span class="highlight">designed to last.</span>
        </p>
        <p class="hero-detail">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer
          dapibus, sem at suscipit tincidunt, arcu erat fermentum nibh, vitae
          posuere massa lectus non turpis.
        </p>
      </div>
    </div>
  </Island>
</template>

<style scoped>
.hero-card {
  width: min(100%, 54rem);
}

.hero-content {
  display: grid;
  grid-template-columns: minmax(12rem, 14rem) minmax(18rem, 28rem);
  justify-content: space-between;
  align-items: center;
  gap: clamp(1.5rem, 4vw, 2.75rem);
  padding: clamp(1.25rem, 3vw, 2rem);
  text-align: left;
}

.hero-intro {
  display: grid;
  gap: 0.5em;
  width: 100%;
  line-height: 1.15;
}

.hero-intro p,
.hero-support,
.hero-detail {
  margin: 0;
}

.hero-copy {
  display: grid;
  gap: 0.9rem;
}

.hero-support {
  line-height: 1.35;
}

.hero-detail {
  max-width: 28rem;
  font-size: 1rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.82);
}

@media (max-width: 900px) {
  .hero-content {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 1.25rem;
  }

  .hero-detail {
    max-width: none;
  }
}

@media (max-width: 480px) {
  .hero-content {
    padding: 1rem;
  }

  .hero-intro {
    line-height: 1.05;
  }
}
</style>
