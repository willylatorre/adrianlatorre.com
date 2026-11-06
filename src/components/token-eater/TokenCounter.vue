<script setup lang="ts">
import { computed } from 'vue'
import { formatRate, formatTokens, groupDigits, toTokens } from '../../features/token-eater/numbers'
import type { DerivedStats } from '../../features/token-eater/engine'
import type { Milestone } from '../../features/token-eater/content'

const props = defineProps<{
  tokensMicro: bigint
  lifetimeMicro: bigint
  stats: DerivedStats
  nextMilestone: Milestone | null
  clickYieldMicro: bigint
  exactView: boolean
  won: boolean
}>()

const emit = defineEmits<{
  click: [event: MouseEvent]
  'toggle-exact': []
}>()

const compact = computed(() => formatTokens(props.tokensMicro))
const exact = computed(() => groupDigits(toTokens(props.tokensMicro)))
/**
 * The goal is the point of the page, so a finished run shows every digit
 * instead of the compact form. `999.99Qa` would hide the joke.
 */
const showExact = computed(() => props.exactView || props.won)
const rateLabel = computed(() => formatRate(props.stats.effectiveRateMicroPerSecond))
const clickLabel = computed(() => formatTokens(props.clickYieldMicro, { fractional: true }))
const progressPercent = computed(() => Math.max(0, Math.min(100, props.stats.progress * 100)))
const progressLabel = computed(() => `${progressPercent.value.toFixed(4)}%`)
const lifetimeLabel = computed(() => formatTokens(props.lifetimeMicro))
const boosted = computed(() => props.stats.boostMultiplier > 1)

function onClick(event: MouseEvent) {
  emit('click', event)
}
</script>

<template>
  <section class="counter" aria-labelledby="counter-heading">
    <div class="counter__meta">
      <span class="counter__label" id="counter-heading">Tokens</span>
      <button
        type="button"
        class="counter__exact-toggle"
        :aria-pressed="showExact"
        :disabled="won"
        @click="emit('toggle-exact')"
      >
        {{ showExact ? 'Compact' : 'Exact' }}
      </button>
    </div>

    <button
      type="button"
      class="counter__muncher"
      :class="{ 'is-won': won }"
      data-token-muncher
      :aria-label="`Consume one token. You have ${exact} tokens and earn ${clickLabel} per click.`"
      :disabled="won"
      @click="onClick"
    >
      <span
        class="counter__value"
        :class="{ 'is-exact': showExact }"
        :data-compact="compact"
        data-token-balance
      >
        {{ showExact ? exact : compact }}
      </span>
      <span v-if="boosted" class="counter__boost" data-boost-label>
        ×{{ stats.boostMultiplier }} production
      </span>
      <span class="counter__hint" aria-hidden="true">click to consume</span>
    </button>

    <dl class="counter__readouts">
      <div>
        <dt>Per second</dt>
        <dd data-rate>{{ rateLabel }}</dd>
      </div>
      <div>
        <dt>Per click</dt>
        <dd data-click-yield>{{ clickLabel }}</dd>
      </div>
      <div>
        <dt>Earned, all time</dt>
        <dd data-lifetime>{{ lifetimeLabel }}</dd>
      </div>
    </dl>

    <div class="counter__progress">
      <div
        class="counter__track"
        role="progressbar"
        aria-label="Progress toward 999,999,999,999,999,999 tokens"
        :aria-valuenow="Number((stats.progress * 100).toFixed(4))"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuetext="progressLabel"
      >
        <span class="counter__fill" :style="{ width: `${progressPercent}%` }" />
      </div>
      <div class="counter__progress-labels">
        <span data-progress-label>{{ progressLabel }}</span>
        <span v-if="nextMilestone" data-next-milestone> Next: {{ nextMilestone.label }} </span>
        <span v-else>Final stretch</span>
      </div>
      <p v-if="nextMilestone" class="counter__note" data-milestone-note>
        {{ nextMilestone.note }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.counter {
  display: grid;
  gap: 1.1rem;
  padding: 1.4rem 1.5rem 1.5rem;
  border: 1px solid var(--site-border);
  border-radius: 0.9rem;
  background: var(--site-surface);
}

.counter__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.counter__label {
  color: var(--site-faint);
  font-size: 0.68rem;
  font-weight: 720;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.counter__exact-toggle {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--site-muted);
  font: inherit;
  font-size: 0.72rem;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.counter__exact-toggle:hover {
  color: var(--site-ink);
}

.counter__exact-toggle:focus-visible {
  outline: 2px solid var(--site-accent);
  outline-offset: 3px;
}

.counter__muncher {
  position: relative;
  display: grid;
  justify-items: start;
  gap: 0.25rem;
  width: 100%;
  padding: 0.4rem 0.2rem 0.5rem;
  border: 0;
  background: transparent;
  color: var(--site-ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
}

.counter__muncher:active .counter__value {
  transform: translateY(1px);
}

.counter__muncher:focus-visible {
  border-radius: 0.4rem;
  outline: 2px solid var(--site-accent);
  outline-offset: 4px;
}

.counter__muncher:disabled {
  cursor: default;
}

.counter__value {
  display: block;
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: clamp(2.4rem, 7vw, 4.6rem);
  font-weight: 660;
  letter-spacing: -0.055em;
  line-height: 0.98;
  font-variant-numeric: tabular-nums;
  transition: transform 120ms ease;
}

/* Eighteen digits plus separators need their own optical size. */
.counter__value.is-exact {
  font-size: clamp(1.5rem, 4.2vw, 2.9rem);
  letter-spacing: -0.045em;
  line-height: 1.08;
}

.counter__muncher.is-won .counter__value {
  color: var(--site-accent);
}

.counter__hint {
  color: var(--site-faint);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.counter__boost {
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  background: color-mix(in oklch, var(--site-accent) 14%, var(--site-bg));
  color: color-mix(in oklch, var(--site-accent) 70%, var(--site-ink));
  font-size: 0.7rem;
  font-weight: 680;
  letter-spacing: 0.04em;
}

.counter__readouts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin: 0;
  padding-top: 1rem;
  border-top: 1px solid var(--site-border);
}

.counter__readouts dt {
  color: var(--site-faint);
  font-size: 0.66rem;
  font-weight: 680;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.counter__readouts dd {
  margin: 0.3rem 0 0;
  color: var(--site-ink);
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}

.counter__progress {
  display: grid;
  gap: 0.5rem;
}

.counter__track {
  height: 0.35rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--site-surface-soft);
}

.counter__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: color-mix(in oklch, var(--site-accent) 66%, var(--site-ink));
  transition: width 240ms linear;
}

.counter__progress-labels {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  color: var(--site-muted);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}

.counter__note {
  margin: 0;
  color: var(--site-muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

@media (max-width: 620px) {
  .counter {
    padding: 1.1rem 1.1rem 1.2rem;
  }

  .counter__readouts {
    gap: 0.6rem;
  }

  .counter__readouts dd {
    font-size: 0.88rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .counter__value,
  .counter__fill {
    transition: none;
  }
}
</style>
