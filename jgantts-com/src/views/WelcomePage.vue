<script setup lang="ts">
import { ref } from 'vue'

const emailAddress = 'contact@jgantts.com'
const popoverMessage = ref('Copy email')
const showPopover = ref(false)
let popoverTimer: ReturnType<typeof setTimeout> | null = null

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(emailAddress)
    popoverMessage.value = 'Email copied'
  } catch {
    popoverMessage.value = 'Copy failed'
  }

  showPopover.value = true

  if (popoverTimer) {
    clearTimeout(popoverTimer)
  }

  popoverTimer = setTimeout(() => {
    showPopover.value = false
    popoverMessage.value = 'Copy email'
  }, 1800)
}
</script>

<template>
  <!-- to do -->
</template>

<style scoped>

.hero-kicker {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.3;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(214, 223, 232, 0.74);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.hero-title {
  margin: 0;
  max-width: 9.5ch;
  font-size: clamp(2.7rem, 5.8vw, 4.7rem);
  line-height: 0.98;
  font-weight: 500;
  color: rgba(236, 241, 246, 0.95);
  text-shadow: 0 3px 14px rgba(0, 0, 0, 0.2);
}

.hero-support {
  margin: 0;
  max-width: 30rem;
  font-size: clamp(1rem, 1.5vw, 1.25rem);
  line-height: 1.45;
  color: rgba(222, 229, 237, 0.86);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  align-items: center;
}

.copy-action-wrap {
  position: relative;
  display: inline-flex;
}

.primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 1.25rem;
  border: 0;
  border-radius: 999px;
  background-color: var(--backgroundSolidAccent);
  color: var(--textAccentOnAccent);
  font: inherit;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.2s ease, filter 0.2s ease, background-color 0.2s ease;
}

.secondary-action {
  display: inline-flex;
  align-items: center;
  padding: 0.6rem 0;
  color: rgba(228, 234, 241, 0.9);
  font-size: 0.95rem;
  line-height: 1.2;
  border-bottom: 1px solid rgba(220, 228, 236, 0.45);
}

.primary-action:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.copy-popover {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.65rem);
  transform: translateX(-50%);
  padding: 0.45rem 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.75rem;
  background: rgba(6, 24, 48, 0.92);
  color: rgba(232, 238, 244, 0.92);
  font-size: 0.82rem;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
}

.copy-popover::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 100%;
  width: 0.55rem;
  height: 0.55rem;
  background: rgba(6, 24, 48, 0.92);
  border-right: 1px solid rgba(255, 255, 255, 0.14);
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  transform: translateX(-50%) rotate(45deg);
}

.hero-rail {
  display: grid;
  gap: 0.9rem;
  padding-top: 1.25rem;
}

.signal-card {
  padding: 0.9rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 1rem;
  background: rgba(6, 24, 48, 0.48);
  backdrop-filter: blur(10px);
}

.signal-label {
  margin: 0 0 0.4rem;
  font-size: 0.75rem;
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(206, 216, 226, 0.7);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.signal-value {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.45;
  color: rgba(228, 234, 241, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.hero-note {
  margin: 0;
  max-width: 22rem;
  font-size: 0.85rem;
  line-height: 1.55;
  color: rgba(206, 216, 226, 0.74);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 1.35rem;
  }

  .hero-title,
  .hero-support,
  .hero-note {
    max-width: none;
  }

  .hero-rail {
    grid-template-columns: 1fr;
    padding-top: 0;
  }
}

@media (max-width: 560px) {
  .hero-title {
    font-size: clamp(2.2rem, 11vw, 3.6rem);
    max-width: none;
  }

  .hero-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .copy-action-wrap,
  .primary-action {
    width: 100%;
  }
}

@media (prefers-color-scheme: light) {
  .hero-support,
  .secondary-action,
  .hero-note {
    color: rgba(56, 70, 86, 0.88);
    text-shadow: none;
  }

  .hero-title {
    color: rgba(46, 60, 76, 0.92);
    text-shadow: none;
  }

  .secondary-action {
    border-bottom-color: rgba(56, 70, 86, 0.35);
  }
}
</style>
