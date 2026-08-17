<script setup lang="ts">
defineProps<{
  code?: string
  language?: string
}>()
</script>

<template>
  <figure class="prose-pre">
    <figcaption v-if="language" class="prose-pre__language">{{ language }}</figcaption>
    <pre><slot>{{ code }}</slot></pre>
  </figure>
</template>

<style scoped>
.prose-pre {
  overflow: hidden;
  margin: 1.5rem 0;
  border: 1px solid var(--site-border);
  border-radius: 0.9rem;
  background: oklch(0.95 0.007 95);
}

.prose-pre__language {
  padding: 0.65rem 0.9rem;
  border-bottom: 1px solid var(--site-border);
  color: var(--site-faint);
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.prose-pre > pre {
  overflow: auto;
  margin: 0;
  border: 0;
  background: transparent;
  padding: 1rem;
}
</style>
