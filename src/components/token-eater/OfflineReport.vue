<script setup lang="ts">
import { formatDuration, formatTokens } from '../../features/token-eater/numbers'

defineProps<{
  open: boolean
  elapsedMs: number
  gainedMicro: bigint
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <UModal
    :open="open"
    :dismissible="true"
    :ui="{ content: 'w-[calc(100vw-2rem)] max-w-[30rem]' }"
    @update:open="(value: boolean) => !value && emit('close')"
  >
    <template #content>
      <div class="offline" data-offline-report>
        <p class="offline__kicker">While you were away</p>
        <h2>Tokens kept arriving.</h2>
        <p class="offline__amount" data-offline-gain>{{ formatTokens(gainedMicro) }}</p>
        <p class="offline__note">
          That is {{ formatDuration(elapsedMs) }} of production. Offline earnings are capped at
          eight hours, so leaving the tab open for a week is not a strategy.
        </p>
        <div class="offline__actions">
          <UButton type="button" color="primary" variant="soft" size="sm" @click="emit('close')">
            Collect
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.offline {
  display: grid;
  gap: 0.4rem;
  padding: 1.5rem;
  background: var(--site-surface);
}

.offline__kicker {
  margin: 0;
  color: var(--site-accent);
  font-size: 0.68rem;
  font-weight: 720;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.offline h2 {
  margin: 0.35rem 0 0;
  font-size: 1.4rem;
  letter-spacing: -0.035em;
}

.offline__amount {
  margin: 0.4rem 0 0;
  color: var(--site-ink);
  font-size: 2rem;
  font-weight: 660;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.offline__note {
  margin: 0.3rem 0 0;
  color: var(--site-muted);
  font-size: 0.84rem;
  line-height: 1.6;
}

.offline__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
