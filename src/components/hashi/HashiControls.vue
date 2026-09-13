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
    bridgeCounts?: BridgeCounts
    canRestoreSnapshot?: boolean
    hintsRemaining?: number
    hasActiveHint?: boolean
    hintUnavailable?: boolean
    boardZoom?: number | null
  }>(),
  {
    bridgeCounts: () => ({}),
    canRestoreSnapshot: false,
    hintsRemaining: 3,
    hasActiveHint: false,
    hintUnavailable: false,
    boardZoom: null,
  },
)

const emit = defineEmits<{
  'select-category': [category: HashiCategory]
  'save-snapshot': []
  'restore-snapshot': []
  'request-hint': []
  'zoom-out': []
  'zoom-fit': []
  'zoom-in': []
  reset: []
  'new-puzzle': []
}>()

const hasBridges = computed(() => Object.values(props.bridgeCounts).some((count) => count > 0))
const boardZoomLabel = computed(() =>
  props.boardZoom === null ? 'Board zoom: fit' : `Board zoom: ${Math.round(props.boardZoom * 100)}%`,
)

function selectCategory(category: HashiCategory) {
  if (category !== props.category) emit('select-category', category)
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

    <div class="hashi-position-actions" aria-label="Puzzle actions">
      <div class="hashi-zoom-controls" aria-label="Board zoom">
        <span data-board-zoom class="hashi-zoom-label" aria-live="polite" :aria-label="boardZoomLabel">
          {{ boardZoom === null ? 'Fit' : `${Math.round(boardZoom * 100)}%` }}
        </span>
        <UButton
          type="button"
          data-action="zoom-out"
          icon="i-lucide-minus"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Zoom out"
          @click="emit('zoom-out')"
        />
        <UButton
          type="button"
          data-action="zoom-fit"
          icon="i-lucide-scan-line"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Fit board to view"
          @click="emit('zoom-fit')"
        />
        <UButton
          type="button"
          data-action="zoom-in"
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Zoom in"
          @click="emit('zoom-in')"
        />
      </div>
      <span
        class="hashi-hint-hearts"
        data-hint-hearts
        :aria-label="`${hintsRemaining} ${hintsRemaining === 1 ? 'hint' : 'hints'} remaining`"
      >
        <span aria-hidden="true">
          <span v-for="heart in 3" :key="heart">{{ heart <= hintsRemaining ? '♥' : '♡' }}</span>
        </span>
      </span>
      <UButton
        type="button"
        data-action="hint"
        icon="i-lucide-lightbulb"
        label="Hint"
        color="neutral"
        variant="soft"
        size="sm"
        :disabled="hintUnavailable || (hintsRemaining === 0 && !hasActiveHint)"
        @click="emit('request-hint')"
      />
      <UButton
        type="button"
        data-action="save-snapshot"
        icon="i-lucide-save"
        label="Save position"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="emit('save-snapshot')"
      />
      <UButton
        type="button"
        data-action="restore-snapshot"
        icon="i-lucide-history"
        label="Restore position"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="!canRestoreSnapshot"
        @click="emit('restore-snapshot')"
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
.hashi-position-actions,
.hashi-zoom-controls {
  display: flex;
  width: max-content;
  align-items: center;
  gap: 2px;
}

.hashi-position-actions {
  flex: none;
  gap: 4px;
}

.hashi-zoom-controls {
  gap: 1px;
  padding-right: 0.35rem;
  border-right: 1px solid var(--site-border);
}

.hashi-zoom-label {
  min-width: 2.9rem;
  color: var(--site-muted);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.hashi-hint-hearts {
  min-width: 3.4rem;
  color: color-mix(in oklch, var(--site-accent) 72%, var(--site-ink));
  font-size: 0.82rem;
  letter-spacing: 0.12em;
  text-align: center;
  white-space: nowrap;
}

@media (max-width: 960px) {
  .hashi-controls {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  .hashi-position-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
