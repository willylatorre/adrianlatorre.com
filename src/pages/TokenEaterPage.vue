<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getCurrentInstance } from 'vue'
import ExperimentFooter from '@/components/experiment/ExperimentFooter.vue'
import ExperimentHeader from '@/components/experiment/ExperimentHeader.vue'
import TokenCounter from '@/components/token-eater/TokenCounter.vue'
import ProducerShop from '@/components/token-eater/ProducerShop.vue'
import PowerupBar from '@/components/token-eater/PowerupBar.vue'
import WinPanel from '@/components/token-eater/WinPanel.vue'
import OfflineReport from '@/components/token-eater/OfflineReport.vue'
import { useTokenEater } from '@/features/token-eater/useTokenEater'
import {
  CLICK_UPGRADE_BY_ID,
  PRODUCERS,
  UPGRADES,
  type ClickUpgradeId,
  type PowerupId,
  type ProducerId,
  type UpgradeId,
} from '@/features/token-eater/content'
import {
  formatDuration,
  formatTokens,
  groupDigits,
  TOKEN_GOAL,
} from '@/features/token-eater/numbers'

const game = useTokenEater()
const exactView = ref(false)
const toast = ref<{ id: number; text: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

const confetti = getCurrentInstance()?.appContext.config.globalProperties.$confetti
let confettiTimer: ReturnType<typeof setTimeout> | undefined

const goalDigits = groupDigits(TOKEN_GOAL)

/** Per-producer rate as displayed, so the shop does not recompute prices twice. */
const ratePerProducer = computed(() => {
  const map = new Map<ProducerId, bigint>()
  const multiplier = game.stats.value.upgradeMultiplier
  for (const producer of PRODUCERS) {
    const base = BigInt(Math.round(producer.baseRate * 1_000_000))
    map.set(producer.id, base * BigInt(multiplier))
  }
  return map
})

const elapsedLabel = computed(() => {
  const state = game.state.value
  const end = state.wonAt ?? Date.now()
  return formatDuration(Math.max(0, end - state.startedAt))
})

const upgradeCount = computed(() => game.state.value.upgrades.length)
const totalUpgrades = computed(() => UPGRADES.length)

const losingProduction = computed(() => {
  const next = game.nextProducer.value
  if (!next) return null
  return PRODUCERS.find((producer) => producer.id === next) ?? null
})

function showToast(text: string) {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { id: Date.now(), text }
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 4_000)
}

function celebrate() {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion || !confetti) return
  if (confettiTimer) clearTimeout(confettiTimer)
  confetti.remove()
  confetti.start({
    particles: [
      { type: 'circle', size: 6 },
      { type: 'rect', size: 5 },
    ],
    defaultColors: ['#38645a', '#c9a96e', '#8b929d'],
    particlesPerFrame: 0.4,
    defaultDropRate: 6,
  })
  confettiTimer = setTimeout(() => {
    confetti.stop()
    confetti.remove()
  }, 2_600)
}

function handleClick() {
  game.click()
  if (game.won.value) onWin()
}

function buyProducer(id: ProducerId, amount: number | 'max') {
  const result = game.buy(id, amount)
  if (!result.ok && result.reason === 'insufficient') {
    showToast('Not enough tokens yet.')
  }
}

function buyGlobalUpgrade(id: UpgradeId) {
  const result = game.buyGlobalUpgrade(id)
  if (result.ok) {
    const definition = UPGRADES.find((upgrade) => upgrade.id === id)
    if (definition)
      showToast(`${definition.name} online. Every producer ×${definition.multiplier}.`)
  }
}

function buyClickUpgrade(id: ClickUpgradeId) {
  const result = game.buyClick(id)
  if (result.ok) {
    const definition = CLICK_UPGRADE_BY_ID.get(id)
    if (definition) showToast(`${definition.name}. Clicks ×${definition.multiplier}.`)
  }
}

function activatePowerup(id: PowerupId) {
  const result = game.usePowerup(id)
  if (result.ok && result.gainedMicro > 0n) {
    showToast(`Collected ${formatTokens(result.gainedMicro)} tokens.`)
  }
}

let winCelebrated = false
function onWin() {
  if (winCelebrated) return
  winCelebrated = true
  celebrate()
}

function restart() {
  if (
    typeof window !== 'undefined' &&
    !window.confirm('Discard this finished run and start from zero tokens?')
  ) {
    return
  }
  winCelebrated = false
  game.reset()
  showToast('Fresh run. One click is one token.')
}

onMounted(() => {
  // A run restored past the goal should still show the finished state.
  if (game.won.value) onWin()
})

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
  if (confettiTimer) clearTimeout(confettiTimer)
  confetti?.remove()
})
</script>

<template>
  <main class="token-eater">
    <ExperimentHeader
      title="Token eater"
      description="Click to consume a token. Buy the machinery that consumes them for you. Reach 999,999,999,999,999,999 and stop."
    />

    <div class="token-eater__stage">
      <WinPanel
        v-if="game.won.value"
        :started-at="game.state.value.startedAt"
        :finished-at="game.state.value.wonAt ?? Date.now()"
        :clicks="game.state.value.clicks"
        :best-upgrades="upgradeCount"
        :total-upgrades="totalUpgrades"
        @restart="restart"
      />
      <TokenCounter
        :tokens-micro="game.state.value.tokens"
        :lifetime-micro="game.state.value.lifetimeTokens"
        :stats="game.stats.value"
        :next-milestone="game.stats.value.nextMilestone"
        :click-yield-micro="game.stats.value.clickYieldMicro"
        :exact-view="exactView"
        :won="game.won.value"
        @click="handleClick"
        @toggle-exact="exactView = !exactView"
      />
    </div>

    <p class="token-eater__goal">
      The goal is <strong data-goal-number>{{ goalDigits }}</strong> tokens. That number is one
      short of a quintillion, and larger than a JavaScript number can store exactly.
    </p>

    <p aria-live="polite" class="token-eater__status" data-live-status>
      <template v-if="game.won.value">
        Run complete in {{ elapsedLabel }}. Start a new run whenever you like.
      </template>
      <template v-else-if="toast">
        {{ toast.text }}
      </template>
      <template v-else-if="losingProduction">
        Next tier: {{ losingProduction.name }} at
        {{ formatTokens(BigInt(losingProduction.baseCost) * 1_000_000n) }} tokens.
      </template>
    </p>

    <div class="token-eater__layout">
      <section class="token-eater__primary" aria-label="Powerups and run notes">
        <PowerupBar :state="game.state.value" :now="Date.now()" @activate="activatePowerup" />

        <div class="token-eater__notes">
          <h2>Run notes</h2>
          <ul data-run-notes>
            <li>
              Prices rise 15% per unit. Rates grow faster than prices between tiers, which is why
              the curve bends upward instead of flattening.
            </li>
            <li>A click always earns at least one token, and at least 1% of your passive rate.</li>
            <li>
              Progress saves in <code>localStorage</code> about every 1.5 seconds. Offline earnings
              are capped at eight hours.
            </li>
            <li v-if="!game.won.value">
              You are {{ formatDuration(Date.now() - game.state.value.startedAt) }} into this run.
            </li>
          </ul>
        </div>

        <details class="token-eater__help">
          <summary>How the numbers work</summary>
          <div class="token-eater__help-body">
            <p>
              Currency is stored as integer micro-tokens, one token being one million micro-tokens.
              That keeps a half-token-per-second rate exact without ever putting a float back into
              the simulation.
            </p>
            <p>
              Prices use exact fractions too: the 15% growth is the rational number 115/100, not the
              float 1.15, so a price after fifty purchases is still an exact integer.
            </p>
            <p>
              The win condition is 999,999,999,999,999,999 tokens. That value is larger than
              <code>Number.MAX_SAFE_INTEGER</code>, so the whole economy uses <code>bigint</code>.
            </p>
          </div>
        </details>

        <p v-if="game.saveError.value" class="token-eater__save-error" role="status">
          The browser refused to save. Check that storage is available in private windows.
        </p>
      </section>

      <aside class="token-eater__secondary" aria-label="Shop">
        <ProducerShop
          :tokens-micro="game.state.value.tokens"
          :producers="game.state.value.producers"
          :upgrades="game.state.value.upgrades"
          :click-upgrades="game.state.value.clickUpgrades"
          :rate-per-producer="ratePerProducer"
          @buy="buyProducer"
          @buy-upgrade="buyGlobalUpgrade"
          @buy-click="buyClickUpgrade"
        />
      </aside>
    </div>

    <OfflineReport
      :open="game.offlineReport.value !== null"
      :elapsed-ms="game.offlineReport.value?.elapsedMs ?? 0"
      :gained-micro="game.offlineReport.value?.gainedMicro ?? 0n"
      @close="game.dismissOfflineReport"
    />

    <ExperimentFooter
      :conclusion="'An incremental game is a curve with a personality. The interesting work was not the clicking; it was deciding how large the numbers get, how to store them without losing units, and how to make a save survive a closed tab.'"
      :links="[
        { label: 'Read the build notes', href: '/blog/notes-from-a-game-about-big-numbers' },
        {
          label: 'MDN: BigInt',
          href: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt',
          external: true,
        },
        {
          label: 'MDN: BroadcastChannel',
          href: 'https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel',
          external: true,
        },
        {
          label: 'MDN: Storage API',
          href: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage',
          external: true,
        },
      ]"
    />
  </main>
</template>

<style scoped>
.token-eater {
  max-width: 76rem;
}

.token-eater__stage {
  display: grid;
  gap: 1rem;
  max-width: 46rem;
}

.token-eater__goal {
  max-width: 46rem;
  margin: 1rem 0 0;
  color: var(--site-muted);
  font-size: 0.84rem;
  line-height: 1.65;
}

.token-eater__goal strong {
  color: var(--site-ink);
  font-variant-numeric: tabular-nums;
}

.token-eater__status {
  min-height: 1.4em;
  max-width: 46rem;
  margin: 0.45rem 0 0;
  color: var(--site-faint);
  font-size: 0.78rem;
  line-height: 1.55;
}

.token-eater__layout {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: clamp(1.5rem, 3vw, 2.75rem);
  align-items: start;
  margin-top: clamp(2rem, 4vw, 3rem);
  padding-top: clamp(1.5rem, 3vw, 2rem);
  border-top: 1px solid var(--site-border);
}

.token-eater__primary,
.token-eater__secondary {
  display: grid;
  gap: 1.4rem;
}

.token-eater__notes h2 {
  margin: 0 0 0.55rem;
  color: var(--site-faint);
  font-size: 0.68rem;
  font-weight: 720;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.token-eater__notes ul {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding-left: 1.15rem;
  color: var(--site-muted);
  font-size: 0.78rem;
  line-height: 1.6;
}

.token-eater__notes code,
.token-eater__help-body code {
  padding: 0.05rem 0.3rem;
  border-radius: 0.2rem;
  background: var(--site-surface-soft);
  font-size: 0.92em;
}

.token-eater__help {
  border-top: 1px solid var(--site-border);
  padding-top: 0.8rem;
}

.token-eater__help summary {
  color: var(--site-muted);
  font-size: 0.8rem;
  font-weight: 620;
  cursor: pointer;
}

.token-eater__help summary:focus-visible {
  outline: 2px solid var(--site-accent);
  outline-offset: 3px;
}

.token-eater__help-body {
  display: grid;
  gap: 0.5rem;
  padding-top: 0.6rem;
}

.token-eater__help-body p {
  margin: 0;
  color: var(--site-muted);
  font-size: 0.78rem;
  line-height: 1.6;
}

.token-eater__save-error {
  margin: 0;
  color: oklch(0.48 0.105 32);
  font-size: 0.78rem;
  line-height: 1.55;
}

@media (max-width: 960px) {
  .token-eater__layout {
    grid-template-columns: 1fr;
  }
}
</style>
