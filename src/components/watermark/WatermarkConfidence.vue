<script setup lang="ts">
import { computed } from 'vue'
import type { WatermarkResult } from '@/utils/watermarkSimulation'

const props = defineProps<{
  result: WatermarkResult
  totalSlots: number
}>()

defineEmits<{
  reset: []
}>()

const verdictCopy = {
  none: {
    label: 'No clear signal',
    description: 'The choices do not form a convincing match.',
  },
  possible: {
    label: 'Possible match',
    description: 'Some choices match this playground’s simulated key.',
  },
  strong: {
    label: 'Strong match',
    description: 'The passage strongly matches this playground’s simulated key.',
  },
} as const

const verdict = computed(() => verdictCopy[props.result.verdict])
const changedLabel = computed(() => {
  if (props.result.changedSlots === 0) return 'Original generated choices'
  if (props.result.changedSlots === 1) return '1 marked choice changed'
  return `${props.result.changedSlots} marked choices changed`
})
</script>

<template>
  <aside class="confidence-panel" aria-labelledby="watermark-confidence-title">
    <div class="confidence-panel__heading">
      <p id="watermark-confidence-title" class="confidence-panel__label">
        Watermark confidence
      </p>
      <UIcon name="i-lucide-fingerprint" class="h-4 w-4" aria-hidden="true" />
    </div>

    <p class="confidence-panel__number">
      <span>{{ result.confidence }}</span><span class="confidence-panel__percent">%</span>
    </p>

    <UProgress
      :model-value="result.confidence"
      :max="100"
      size="sm"
      color="neutral"
      :aria-label="`Watermark confidence ${result.confidence} percent`"
      :ui="{
        base: 'bg-[var(--site-surface-soft)]',
        indicator:
          'bg-[var(--site-accent)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
      }"
    />

    <div class="confidence-panel__verdict" role="status" aria-live="polite">
      <UBadge color="neutral" variant="soft" size="sm">{{ verdict.label }}</UBadge>
      <p>{{ verdict.description }}</p>
    </div>

    <dl class="confidence-panel__details">
      <div>
        <dt>Edits</dt>
        <dd>{{ changedLabel }}</dd>
      </div>
      <div>
        <dt>Aligned observations</dt>
        <dd>{{ result.alignedObservations }} / {{ result.totalObservations }}</dd>
      </div>
      <div>
        <dt>Available choices</dt>
        <dd>{{ totalSlots }} marked words</dd>
      </div>
    </dl>

    <UButton
      label="Reset passage"
      icon="i-lucide-rotate-ccw"
      color="neutral"
      variant="outline"
      size="sm"
      block
      :disabled="result.changedSlots === 0"
      @click="$emit('reset')"
    />
  </aside>
</template>

<style scoped>
.confidence-panel {
  color: var(--site-ink);
}

.confidence-panel__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: var(--site-muted);
}

.confidence-panel__label {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.confidence-panel__number {
  display: flex;
  align-items: baseline;
  margin: 0.45rem 0 0.72rem;
  font-size: clamp(3.2rem, 7vw, 5.4rem);
  font-weight: 620;
  letter-spacing: -0.075em;
  line-height: 0.92;
}

.confidence-panel__percent {
  margin-left: 0.08em;
  color: var(--site-muted);
  font-size: 0.38em;
  letter-spacing: -0.02em;
}

.confidence-panel__verdict {
  margin-top: 1rem;
}

.confidence-panel__verdict p {
  margin: 0.55rem 0 0;
  color: var(--site-muted);
  font-size: 0.82rem;
  line-height: 1.55;
}

.confidence-panel__details {
  display: grid;
  gap: 0.72rem;
  margin: 1.4rem 0;
  padding: 1rem 0;
  border-top: 1px solid var(--site-border);
  border-bottom: 1px solid var(--site-border);
}

.confidence-panel__details div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.8rem;
}

.confidence-panel__details dt {
  color: var(--site-faint);
  font-size: 0.72rem;
}

.confidence-panel__details dd {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 620;
  text-align: right;
}
</style>
