<script setup lang="ts">
import { computed } from 'vue'
import type { BridgeCounts, HashiCategory } from '../../features/hashi/types'

const categories: ReadonlyArray<{ value: HashiCategory; label: string }> = [
  { value: 'intro', label: 'Intro' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const props = withDefaults(
  defineProps<{
    category: HashiCategory
    historyLength?: number
    bridgeCounts?: BridgeCounts
  }>(),
  {
    historyLength: 0,
    bridgeCounts: () => ({}),
  },
)

const emit = defineEmits<{
  'select-category': [category: HashiCategory]
  undo: []
  reset: []
  'new-puzzle': []
}>()

const hasBridges = computed(() => Object.values(props.bridgeCounts).some((count) => count > 0))

function selectCategory(category: HashiCategory) {
  if (category !== props.category) emit('select-category', category)
}

function undo() {
  if (props.historyLength > 0) emit('undo')
}

function destructiveAction(action: 'reset' | 'new-puzzle') {
  const message =
    action === 'reset'
      ? 'Clear every bridge and restart this puzzle?'
      : 'Replace this puzzle and discard your bridges?'

  if (hasBridges.value && typeof window !== 'undefined' && !window.confirm(message)) return
  if (action === 'reset') emit('reset')
  else emit('new-puzzle')
}
</script>

<template>
  <div class="hashi-controls">
    <nav class="hashi-category-scroll" aria-label="Puzzle category">
      <div class="hashi-category-tabs" role="tablist" aria-label="Puzzle category">
        <UButton
          v-for="item in categories"
          :key="item.value"
          type="button"
          role="tab"
          color="neutral"
          size="sm"
          :variant="item.value === category ? 'soft' : 'ghost'"
          :aria-selected="item.value === category"
          :aria-current="item.value === category ? 'page' : undefined"
          @click="selectCategory(item.value)"
        >
          {{ item.label }}
        </UButton>
      </div>
    </nav>

    <div class="hashi-history-actions" aria-label="Puzzle actions">
      <UButton
        type="button"
        data-action="undo"
        icon="i-lucide-undo-2"
        label="Undo"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="historyLength === 0"
        @click="undo"
      />
      <UButton
        type="button"
        data-action="reset"
        label="Reset"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="destructiveAction('reset')"
      />
      <UButton
        type="button"
        data-action="new-puzzle"
        icon="i-lucide-refresh-cw"
        label="New puzzle"
        color="neutral"
        variant="outline"
        size="sm"
        @click="destructiveAction('new-puzzle')"
      />
    </div>
  </div>
</template>

<style scoped>
.hashi-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.hashi-category-scroll {
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
}

.hashi-category-tabs,
.hashi-history-actions {
  display: flex;
  width: max-content;
  align-items: center;
  gap: 2px;
}

.hashi-history-actions {
  flex: none;
  gap: 4px;
}

@media (max-width: 700px) {
  .hashi-controls {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  .hashi-history-actions {
    width: 100%;
  }
}
</style>
