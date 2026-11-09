<script setup lang="ts">
import { computed } from 'vue'
import { POWERUPS, type PowerupId } from '../../features/token-eater/content'
import type { EngineState } from '../../features/token-eater/engine'
import { powerupCooldownRemainingMs } from '../../features/token-eater/engine'
import { formatDuration } from '../../features/token-eater/numbers'

const props = defineProps<{ state: EngineState }>()

const emit = defineEmits<{
  activate: [id: PowerupId]
}>()

const visible = computed(() =>
  POWERUPS.filter((powerup) => props.state.lifetimeTokens >= powerup.unlockAt * 1_000_000n),
)

function remaining(powerupId: PowerupId): number {
  return powerupCooldownRemainingMs(props.state, powerupId)
}

function isReady(powerupId: PowerupId): boolean {
  return remaining(powerupId) === 0
}

function boostActive(): boolean {
  return props.state.boostRemainingMs > 0
}

function boostRemaining(): string {
  return formatDuration(props.state.boostRemainingMs)
}
</script>

<template>
  <section v-if="visible.length > 0" class="powerups" aria-labelledby="powerups-heading">
    <header class="powerups__header">
      <h2 id="powerups-heading">Powerups</h2>
      <p class="powerups__status" aria-live="polite" data-boost-status>
        <template v-if="boostActive()">Boost active, {{ boostRemaining() }} left</template>
        <template v-else>Ready when you are</template>
      </p>
    </header>

    <ul class="powerups__list">
      <li v-for="powerup in visible" :key="powerup.id">
        <button
          type="button"
          class="powerups__button"
          :class="{ 'is-ready': isReady(powerup.id), 'is-cooling': !isReady(powerup.id) }"
          :data-powerup="powerup.id"
          :disabled="!isReady(powerup.id)"
          :aria-label="`${powerup.name}: ${powerup.blurb}`"
          @click="emit('activate', powerup.id)"
        >
          <UIcon :name="powerup.icon" class="powerups__icon" aria-hidden="true" />
          <span class="powerups__text">
            <span class="powerups__name">{{ powerup.name }}</span>
            <span class="powerups__blurb">{{ powerup.blurb }}</span>
          </span>
          <span class="powerups__timing">
            <template v-if="isReady(powerup.id)">Ready</template>
            <template v-else>{{ formatDuration(remaining(powerup.id)) }}</template>
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.powerups {
  display: grid;
  gap: 0.7rem;
}

.powerups__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.powerups__header h2 {
  margin: 0;
  color: var(--site-faint);
  font-size: 0.68rem;
  font-weight: 720;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.powerups__status {
  margin: 0;
  color: var(--site-muted);
  font-size: 0.72rem;
}

.powerups__list {
  display: grid;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.powerups__button {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0.75rem;
  border: 0;
  border-bottom: 1px solid var(--site-border);
  border-radius: 0;
  background: transparent;
  color: var(--site-ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    opacity 160ms ease;
}

.powerups__button.is-ready {
  border-color: color-mix(in oklch, var(--site-accent) 34%, var(--site-border));
  background: color-mix(in oklch, var(--site-accent) 5%, transparent);
}

.powerups__button.is-ready:hover {
  background: color-mix(in oklch, var(--site-accent) 9%, transparent);
}

.powerups__button.is-cooling {
  cursor: not-allowed;
  opacity: 0.6;
}

.powerups__button:focus-visible {
  outline: 2px solid var(--site-accent);
  outline-offset: 2px;
}

.powerups__icon {
  width: 1rem;
  height: 1rem;
  flex: none;
  color: var(--site-faint);
}

.powerups__button.is-ready .powerups__icon {
  color: var(--site-accent);
}

.powerups__text {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 0.1rem;
}

.powerups__name {
  font-size: 0.82rem;
  font-weight: 640;
}

.powerups__blurb {
  color: var(--site-muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.powerups__timing {
  flex: none;
  color: var(--site-faint);
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
}

.powerups__button.is-ready .powerups__timing {
  color: color-mix(in oklch, var(--site-accent) 68%, var(--site-ink));
  font-weight: 640;
}
</style>
