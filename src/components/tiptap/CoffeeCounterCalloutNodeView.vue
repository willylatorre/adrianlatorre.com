<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import CoffeeCounterCallout from '@/components/CoffeeCounterCallout.vue'
</script>

<template>
  <NodeViewWrapper
    class="rounded-2xl border border-amber-200 bg-amber-50/60 p-4"
    contenteditable="false"
  >
    <CoffeeCounterCallout />
    <div class="hidden" data-node-view-content></div>
  </NodeViewWrapper>
</template>
