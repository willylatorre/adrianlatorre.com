<script setup lang="ts">
import { computed } from 'vue'
import { WIN_NOTE } from '../../features/token-eater/content'
import { formatDuration, groupDigits, TOKEN_GOAL } from '../../features/token-eater/numbers'

const props = defineProps<{
  startedAt: number
  finishedAt: number
  clicks: number
  bestUpgrades: number
  totalUpgrades: number
}>()

const emit = defineEmits<{
  restart: []
}>()

const elapsed = computed(() => formatDuration(props.finishedAt - props.startedAt))
const goalDigits = computed(() => groupDigits(TOKEN_GOAL))
const upgradeLabel = computed(() =>
  props.bestUpgrades === props.totalUpgrades
    ? 'every efficiency upgrade'
    : `${props.bestUpgrades} of ${props.totalUpgrades} efficiency upgrades`,
)
</script>

<template>
  <section class="win" data-win-panel aria-labelledby="win-heading">
    <p class="win__kicker">Run complete</p>
    <h2 id="win-heading">You ate every token.</h2>
    <p class="win__number">{{ goalDigits }}</p>
    <p class="win__note">{{ WIN_NOTE }}</p>

    <dl class="win__stats">
      <div>
        <dt>Time</dt>
        <dd>{{ elapsed }}</dd>
      </div>
      <div>
        <dt>Clicks</dt>
        <dd>{{ clicks.toLocaleString('en') }}</dd>
      </div>
      <div>
        <dt>Purchased</dt>
        <dd>{{ upgradeLabel }}</dd>
      </div>
    </dl>

    <p class="win__footnote">
      The save still holds the finished run. Start again whenever you want to watch the curve from
      the bottom.
    </p>

    <UButton type="button" color="primary" variant="soft" size="sm" @click="emit('restart')">
      Start a new run
    </UButton>
  </section>
</template>

<style scoped>
.win {
  display: grid;
  justify-items: start;
  gap: 0.55rem;
  padding: 1.5rem;
  border: 1px solid color-mix(in oklch, var(--site-accent) 34%, var(--site-border));
  border-radius: 0.9rem;
  background: color-mix(in oklch, var(--site-accent) 5%, var(--site-surface));
}

.win__kicker {
  margin: 0;
  color: var(--site-accent);
  font-size: 0.68rem;
  font-weight: 720;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.win h2 {
  margin: 0.2rem 0 0;
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  font-weight: 660;
  letter-spacing: -0.04em;
  line-height: 1.05;
}

.win__number {
  margin: 0.3rem 0 0;
  color: var(--site-ink);
  font-size: clamp(0.95rem, 2.6vw, 1.25rem);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.win__note {
  max-width: 56ch;
  margin: 0;
  color: var(--site-muted);
  font-size: 0.86rem;
  line-height: 1.6;
}

.win__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  width: 100%;
  margin: 0.7rem 0 0;
  padding-top: 0.9rem;
  border-top: 1px solid color-mix(in oklch, var(--site-accent) 20%, var(--site-border));
}

.win__stats dt {
  color: var(--site-faint);
  font-size: 0.66rem;
  font-weight: 680;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.win__stats dd {
  margin: 0.25rem 0 0;
  color: var(--site-ink);
  font-size: 0.86rem;
  font-variant-numeric: tabular-nums;
}

.win__footnote {
  max-width: 60ch;
  margin: 0.4rem 0 0.3rem;
  color: var(--site-faint);
  font-size: 0.76rem;
  line-height: 1.55;
}

@media (max-width: 620px) {
  .win__stats {
    grid-template-columns: 1fr;
    gap: 0.55rem;
  }
}
</style>
