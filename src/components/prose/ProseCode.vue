<template>
  <code class="prose-code">
    <slot />
  </code>
</template>

<style scoped>
.prose-code {
  display: block;
  color: oklch(0.24 0.012 260);
  font-size: 0.9rem;
  line-height: 1.7;
  white-space: pre;
}
</style>
