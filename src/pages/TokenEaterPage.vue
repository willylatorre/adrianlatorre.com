<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getCurrentInstance } from 'vue'
import ExperimentFooter from '@/components/experiment/ExperimentFooter.vue'
import ExperimentHeader from '@/components/experiment/ExperimentHeader.vue'
import TokenCounter from '@/components/token-eater/TokenCounter.vue'
import ProducerShop from '@/components/token-eater/ProducerShop.vue'
import PowerupBar from '@/components/token-eater/PowerupBar.vue'
import WinPanel from '@/components/token-eater/WinPanel.vue'
import { useTokenEater } from '@/features/token-eater/useTokenEater'
import { autoClickerCost, producerCost } from '@/features/token-eater/engine'
import {
  CLICK_UPGRADE_BY_ID,
  CLICK_UPGRADE_COST_MICRO,
  CLICK_UPGRADES,
  PRODUCERS,
  UPGRADES,
  UPGRADE_COST_MICRO,
  visibleProducerDefinitions,
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
const shopTab = ref<'upgrades' | 'producers'>('upgrades')
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
  return formatDuration(game.state.value.playTimeMs)
})

const upgradeCount = computed(() => game.state.value.upgrades.length)
const totalUpgrades = computed(() => UPGRADES.length)

const affordableUpgradeCount = computed(() => {
  const state = game.state.value
  let count =
    state.autoClickers < 1_000_000 && autoClickerCost(state.autoClickers) <= state.tokens ? 1 : 0
  count += UPGRADES.filter(
    (upgrade) =>
      !state.upgrades.includes(upgrade.id) &&
      (UPGRADE_COST_MICRO.get(upgrade.id) ?? 0n) <= state.tokens,
  ).length
  count += CLICK_UPGRADES.filter(
    (upgrade) =>
      !state.clickUpgrades.includes(upgrade.id) &&
      (CLICK_UPGRADE_COST_MICRO.get(upgrade.id) ?? 0n) <= state.tokens,
  ).length
  return count
})

const affordableProducerCount = computed(() => {
  const state = game.state.value
  return visibleProducerDefinitions(state.producers).filter(
    (producer) => producerCost(producer.id, state.producers[producer.id] ?? 0) <= state.tokens,
  ).length
})

const upgradeTabLabel = computed(() =>
  affordableUpgradeCount.value > 0
    ? `Upgrades, ${affordableUpgradeCount.value} ready to buy`
    : 'Upgrades',
)
const producerTabLabel = computed(() =>
  affordableProducerCount.value > 0
    ? `Build capacity, ${affordableProducerCount.value} affordable tiers`
    : 'Build capacity',
)

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

function hireIntern(amount: number | 'max') {
  const before = game.state.value.autoClickers
  const result = game.buyAutoClicker(amount)
  if (result.ok) {
    const hired = result.state.autoClickers - before
    showToast(
      `${hired} intern${hired === 1 ? '' : 's'} on duty. ${hired} automatic click${hired === 1 ? '' : 's'} per second.`,
    )
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

    <section class="token-eater__board" aria-label="Token Eater game">
      <div class="token-eater__console">
        <section class="token-eater__counter-column" aria-label="Token counter">
          <WinPanel
            v-if="game.won.value"
            :play-time-ms="game.state.value.playTimeMs"
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
          <p class="token-eater__goal">
            The goal is <strong data-goal-number>{{ goalDigits }}</strong> tokens. That number is
            one short of a quintillion, and larger than a JavaScript number can store exactly.
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
              {{
                formatTokens(
                  producerCost(
                    losingProduction.id,
                    game.state.value.producers[losingProduction.id] ?? 0,
                  ),
                )
              }}
              tokens.
            </template>
          </p>

          <PowerupBar :state="game.state.value" @activate="activatePowerup" />

          <div class="token-eater__notes">
            <h2>Run notes</h2>
            <ul data-run-notes>
              <li>
                Prices rise 15% per unit. Rates grow faster than prices between tiers, which is why
                the curve bends upward instead of flattening.
              </li>
              <li>
                A click always earns at least one token, and at least 1% of your passive rate.
              </li>
              <li>
                Progress saves locally about every 1.5 seconds. No account or server is required.
              </li>
              <li v-if="!game.won.value">
                You are {{ formatDuration(game.state.value.playTimeMs) }} into this run.
              </li>
            </ul>
          </div>

          <details class="token-eater__help">
            <summary>How the numbers work</summary>
            <div class="token-eater__help-body">
              <p>
                Currency is stored as integer micro-tokens, one token being one million
                micro-tokens. That keeps a half-token-per-second rate exact without ever putting a
                float back into the simulation.
              </p>
              <p>
                Prices use exact fractions too: the 15% growth is the rational number 115/100, not
                the float 1.15, so a price after fifty purchases is still an exact integer.
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

        <section class="token-eater__shop-column" aria-label="Game shop">
          <nav class="token-eater__shop-tabs" role="tablist" aria-label="Shop category">
            <button
              id="token-eater-tab-upgrades"
              type="button"
              role="tab"
              :aria-selected="shopTab === 'upgrades'"
              :aria-controls="'token-eater-shop-panel'"
              :aria-label="upgradeTabLabel"
              :title="upgradeTabLabel"
              :class="{ 'is-active': shopTab === 'upgrades' }"
              data-shop-tab="upgrades"
              @click="shopTab = 'upgrades'"
            >
              <span>Upgrades</span>
              <span v-if="affordableUpgradeCount > 0" class="token-eater__tab-notice">
                <UIcon name="i-lucide-bell-dot" aria-hidden="true" />
                {{ affordableUpgradeCount }}
              </span>
            </button>
            <button
              id="token-eater-tab-producers"
              type="button"
              role="tab"
              :aria-selected="shopTab === 'producers'"
              :aria-controls="'token-eater-shop-panel'"
              :aria-label="producerTabLabel"
              :title="producerTabLabel"
              :class="{ 'is-active': shopTab === 'producers' }"
              data-shop-tab="producers"
              @click="shopTab = 'producers'"
            >
              <span>Build capacity</span>
              <span v-if="affordableProducerCount > 0" class="token-eater__tab-notice">
                <UIcon name="i-lucide-bell-dot" aria-hidden="true" />
                {{ affordableProducerCount }}
              </span>
            </button>
          </nav>

          <div
            id="token-eater-shop-panel"
            role="tabpanel"
            :aria-labelledby="
              shopTab === 'upgrades' ? 'token-eater-tab-upgrades' : 'token-eater-tab-producers'
            "
            class="token-eater__shop-panel"
          >
            <ProducerShop
              :mode="shopTab"
              :tokens-micro="game.state.value.tokens"
              :producers="game.state.value.producers"
              :upgrades="game.state.value.upgrades"
              :click-upgrades="game.state.value.clickUpgrades"
              :auto-clickers="game.state.value.autoClickers"
              :rate-per-producer="ratePerProducer"
              @buy="buyProducer"
              @buy-upgrade="buyGlobalUpgrade"
              @buy-click="buyClickUpgrade"
              @buy-auto-clicker="hireIntern"
            />
          </div>
        </section>
      </div>
    </section>

    <ExperimentFooter
      :conclusion="'An incremental game is a curve with a personality. The interesting work was not the clicking; it was deciding how large the numbers get and how to store them without losing units.'"
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

.token-eater__board {
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--site-border);
  border-radius: 0.85rem;
  background: var(--site-surface);
}

.token-eater__console {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  align-items: start;
}

.token-eater__counter-column {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 0.8rem;
  padding: clamp(1rem, 2vw, 1.35rem);
}

.token-eater__shop-column {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 0.9rem;
  padding: clamp(1rem, 2vw, 1.35rem);
  border-left: 1px solid var(--site-border);
}

.token-eater__shop-tabs {
  display: flex;
  gap: 0.3rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid var(--site-border);
}

.token-eater__shop-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.42rem 0.7rem;
  border: 1px solid transparent;
  border-radius: 0.35rem;
  background: transparent;
  color: var(--site-muted);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 620;
  cursor: pointer;
}

.token-eater__tab-notice {
  display: inline-flex;
  align-items: center;
  gap: 0.16rem;
  color: color-mix(in oklch, var(--site-accent) 74%, var(--site-ink));
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
}

.token-eater__tab-notice :deep(svg) {
  width: 0.78rem;
  height: 0.78rem;
}

.token-eater__shop-tabs button:hover {
  color: var(--site-ink);
}

.token-eater__shop-tabs button.is-active {
  border-color: var(--site-border);
  background: var(--site-surface-soft);
  color: var(--site-ink);
}

.token-eater__shop-tabs button:focus-visible {
  outline: 2px solid var(--site-accent);
  outline-offset: 2px;
}

.token-eater__shop-panel {
  min-width: 0;
}

.token-eater__counter-column :deep(.counter) {
  padding: 0.25rem 0.1rem 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.token-eater__counter-column :deep(.counter__value) {
  font-size: clamp(2.1rem, 4.2vw, 3.5rem);
}

.token-eater__counter-column :deep(.counter__value.is-exact) {
  font-size: clamp(1.3rem, 2.6vw, 2.25rem);
}

.token-eater__counter-column :deep(.win) {
  padding: 0 0 0.9rem;
  border: 0;
  border-radius: 0;
  border-bottom: 1px solid var(--site-border);
  background: transparent;
}

.token-eater__goal {
  max-width: 54ch;
  margin: 0;
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
  max-width: 54ch;
  margin: 0;
  color: var(--site-faint);
  font-size: 0.78rem;
  line-height: 1.55;
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
  .token-eater__console {
    grid-template-columns: minmax(0, 1fr);
  }

  .token-eater__shop-column {
    border-top: 1px solid var(--site-border);
    border-left: 0;
  }

  .token-eater__shop-tabs {
    overflow-x: auto;
  }
}
</style>
