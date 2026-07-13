<script setup lang="ts">
import { WaveCounter } from '@waves-counter/vue'
const toast = useToast()

function showError(): void {
  toast.add({
    title: 'Coffee counter unavailable',
    description: 'Your coffee was not recorded. Please try again.',
    icon: 'i-lucide-triangle-alert',
    color: 'error',
  })
}
</script>

<template>
  <WaveCounter
    class="coffee-counter"
    counter-key="coffee"
    endpoint="/api/waves"
    theme="light"
    @error="showError"
  />
</template>

<style scoped>
.coffee-counter {
  --wave-counter-surface: transparent;
  --wave-counter-border: transparent;
  --wave-counter-radius: 0.375rem;
}

.coffee-counter :deep(.wave-counter__trigger) {
  min-width: 3rem;
  min-height: 2rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}
</style>
