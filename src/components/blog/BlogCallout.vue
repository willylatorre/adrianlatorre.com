<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <aside class="blog-callout">
    <p v-if="title" class="blog-callout__title">{{ title }}</p>
    <div class="blog-callout__body">
      <slot />
    </div>
  </aside>
</template>

<style scoped>
.blog-callout {
  border: 1px solid rgba(15, 23, 42, 0.2);
  background: rgba(15, 23, 42, 0.02);
  padding: 16px 18px;
  margin: 24px 0;
}

.blog-callout__title {
  font-variant: small-caps;
  letter-spacing: 0.06em;
  font-size: 12px;
  margin: 0 0 8px;
}

.blog-callout__body :deep(p) {
  margin: 0;
}
</style>
