<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <header class="experiment-header">
    <p class="experiment-header__eyebrow">Playground</p>
    <h1>{{ title }}</h1>
    <p class="experiment-header__description">{{ description }}</p>
  </header>
</template>

<style scoped>
.experiment-header {
  max-width: 55rem;
  padding: clamp(0.25rem, 1.5vw, 1rem) 0 clamp(2.5rem, 6vw, 4.5rem);
}

.experiment-header__eyebrow {
  margin: 0 0 1rem;
  color: var(--site-accent);
  font-size: 0.7rem;
  font-weight: 720;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  max-width: 17ch;
  margin: 0;
  color: var(--site-ink);
  font-size: clamp(2.5rem, 6vw, 4.75rem);
  font-weight: 660;
  letter-spacing: -0.06em;
  line-height: 0.98;
}

.experiment-header__description {
  max-width: 65ch;
  margin: clamp(1.2rem, 2.5vw, 1.75rem) 0 0;
  color: var(--site-muted);
  font-size: clamp(1.02rem, 0.96rem + 0.25vw, 1.2rem);
  line-height: 1.65;
}
</style>
