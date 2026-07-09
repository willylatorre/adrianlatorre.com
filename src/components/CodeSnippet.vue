<script setup lang="ts">
defineProps<{
  code: string
  language?: string
}>()
</script>

<template>
  <figure
    class="min-w-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-slate-100"
  >
    <figcaption
      v-if="language"
      class="border-b border-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400"
    >
      {{ language }}
    </figcaption>
    <pre class="min-w-0 overflow-x-auto p-4 text-sm leading-6"><code>{{ code }}</code></pre>
  </figure>
</template>
