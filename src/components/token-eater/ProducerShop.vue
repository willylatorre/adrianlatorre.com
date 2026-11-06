<script setup lang="ts">
import { computed } from 'vue'
import {
  CLICK_UPGRADES,
  PRODUCERS,
  UPGRADES,
  type ClickUpgradeId,
  type ProducerId,
  type UpgradeId,
} from '../../features/token-eater/content'
import { UPGRADE_COST_MICRO, CLICK_UPGRADE_COST_MICRO } from '../../features/token-eater/content'
import { producerCost } from '../../features/token-eater/engine'
import { formatTokens } from '../../features/token-eater/numbers'

const props = defineProps<{
  tokensMicro: bigint
  producers: Record<ProducerId, number>
  upgrades: UpgradeId[]
  clickUpgrades: ClickUpgradeId[]
  ratePerProducer: ReadonlyMap<ProducerId, bigint>
}>()

const emit = defineEmits<{
  buy: [id: ProducerId, amount: number | 'max']
  'buy-upgrade': [id: UpgradeId]
  'buy-click': [id: ClickUpgradeId]
}>()

/** Which tier the shop should keep visible. Later tiers reveal as you earn. */
const visibleProducers = computed(() => {
  const firstUnownedIndex = PRODUCERS.findIndex(
    (producer) => (props.producers[producer.id] ?? 0) === 0,
  )
  // Show everything already owned, plus the next two unowned tiers, so there
  // is always something to aim at without spoiling the whole ladder at once.
  const cutoff = firstUnownedIndex === -1 ? PRODUCERS.length : firstUnownedIndex + 3
  return PRODUCERS.slice(0, Math.min(cutoff, PRODUCERS.length))
})

/**
 * Upgrades reveal in order, two ahead of the last owned one, so the shop is an
 * unfolding ladder rather than a wall of things you cannot afford. Owned
 * upgrades stay visible so the multipliers remain legible.
 */
const visibleUpgrades = computed(() => {
  const firstUnownedIndex = UPGRADES.findIndex((upgrade) => !props.upgrades.includes(upgrade.id))
  const cutoff = firstUnownedIndex === -1 ? UPGRADES.length : firstUnownedIndex + 2
  return UPGRADES.slice(0, Math.min(cutoff, UPGRADES.length))
})

const nextUpgrade = computed(
  () => UPGRADES.find((upgrade) => !props.upgrades.includes(upgrade.id)) ?? null,
)

const pendingClickUpgrades = computed(() =>
  CLICK_UPGRADES.filter((upgrade) => !props.clickUpgrades.includes(upgrade.id)).slice(0, 3),
)

function priceOf(id: ProducerId): bigint {
  return producerCost(id, props.producers[id] ?? 0)
}

function affordable(id: ProducerId): boolean {
  return priceOf(id) <= props.tokensMicro
}

function projectedRate(producerId: ProducerId): bigint {
  return props.ratePerProducer.get(producerId) ?? 0n
}

function buyAmount(id: ProducerId, mode: 'one' | 'ten' | 'max') {
  emit('buy', id, mode === 'max' ? 'max' : mode === 'ten' ? 10 : 1)
}

function upgradePrice(id: UpgradeId): bigint {
  return UPGRADE_COST_MICRO.get(id) ?? 0n
}

function clickUpgradePrice(id: ClickUpgradeId): bigint {
  return CLICK_UPGRADE_COST_MICRO.get(id) ?? 0n
}
</script>

<template>
  <section class="shop" aria-labelledby="shop-heading">
    <header class="shop__header">
      <h2 id="shop-heading">Build capacity</h2>
      <p>Each purchase makes tokens faster. Prices rise 15% per unit.</p>
    </header>

    <ul class="shop__list">
      <li
        v-for="producer in visibleProducers"
        :key="producer.id"
        class="shop__item"
        :class="{ 'is-affordable': affordable(producer.id) }"
        :data-producer="producer.id"
      >
        <div class="shop__identity">
          <UIcon :name="producer.icon" class="shop__icon" aria-hidden="true" />
          <div class="shop__text">
            <span class="shop__name">
              {{ producer.name }}
              <span v-if="(producers[producer.id] ?? 0) > 0" class="shop__owned">
                {{ producers[producer.id] }}
              </span>
            </span>
            <span class="shop__blurb">{{ producer.blurb }}</span>
            <span class="shop__rate">
              {{ formatTokens(projectedRate(producer.id), { fractional: true }) }}/s each
            </span>
          </div>
        </div>

        <div class="shop__actions">
          <span class="shop__price" :data-producer-price="producer.id">
            {{ formatTokens(priceOf(producer.id)) }}
          </span>
          <div class="shop__buttons">
            <UButton
              type="button"
              size="xs"
              color="neutral"
              variant="soft"
              :disabled="!affordable(producer.id)"
              :aria-label="`Buy one ${producer.name}`"
              @click="buyAmount(producer.id, 'one')"
            >
              ×1
            </UButton>
            <UButton
              type="button"
              size="xs"
              color="neutral"
              variant="ghost"
              :disabled="!affordable(producer.id)"
              :aria-label="`Buy ten ${producer.name}`"
              @click="buyAmount(producer.id, 'ten')"
            >
              ×10
            </UButton>
            <UButton
              type="button"
              size="xs"
              color="neutral"
              variant="ghost"
              :disabled="!affordable(producer.id)"
              :aria-label="`Buy as many ${producer.name} as possible`"
              @click="buyAmount(producer.id, 'max')"
            >
              Max
            </UButton>
          </div>
        </div>
      </li>
    </ul>

    <div class="shop__upgrades">
      <h3>Efficiency</h3>
      <p class="shop__upgrades-note">
        One-time multipliers. They apply to everything you already own.
      </p>
      <ul class="shop__upgrade-list">
        <li
          v-for="upgrade in visibleUpgrades"
          :key="upgrade.id"
          class="shop__upgrade"
          :class="{
            'is-owned': upgrades.includes(upgrade.id),
            'is-affordable':
              !upgrades.includes(upgrade.id) && tokensMicro >= upgradePrice(upgrade.id),
          }"
          :data-upgrade="upgrade.id"
        >
          <div class="shop__identity">
            <UIcon :name="upgrade.icon" class="shop__icon" aria-hidden="true" />
            <div class="shop__text">
              <span class="shop__name">{{ upgrade.name }}</span>
              <span class="shop__blurb">{{ upgrade.blurb }}</span>
            </div>
          </div>
          <div class="shop__actions">
            <span v-if="upgrades.includes(upgrade.id)" class="shop__owned-tag">
              <UIcon name="i-lucide-circle-check" aria-hidden="true" />
              Owned
            </span>
            <template v-else>
              <span class="shop__price">{{ formatTokens(upgradePrice(upgrade.id)) }}</span>
              <UButton
                type="button"
                size="xs"
                color="neutral"
                :variant="tokensMicro >= upgradePrice(upgrade.id) ? 'soft' : 'ghost'"
                :disabled="tokensMicro < upgradePrice(upgrade.id)"
                :aria-label="`Buy ${upgrade.name}`"
                @click="emit('buy-upgrade', upgrade.id)"
              >
                ×{{ upgrade.multiplier }}
              </UButton>
            </template>
          </div>
        </li>
      </ul>
      <p v-if="nextUpgrade" class="shop__next">
        Next multiplier at {{ formatTokens(upgradePrice(nextUpgrade.id)) }} tokens:
        {{ nextUpgrade.name }}.
      </p>
    </div>

    <div class="shop__upgrades">
      <h3>Clicking</h3>
      <p class="shop__upgrades-note">
        Clicks always earn at least 1% of your passive rate. These multiply that.
      </p>
      <ul class="shop__upgrade-list">
        <li
          v-for="upgrade in pendingClickUpgrades"
          :key="upgrade.id"
          class="shop__upgrade"
          :class="{
            'is-affordable': tokensMicro >= clickUpgradePrice(upgrade.id),
          }"
          :data-click-upgrade="upgrade.id"
        >
          <div class="shop__identity">
            <UIcon :name="upgrade.icon" class="shop__icon" aria-hidden="true" />
            <div class="shop__text">
              <span class="shop__name">{{ upgrade.name }}</span>
              <span class="shop__blurb">{{ upgrade.blurb }}</span>
            </div>
          </div>
          <div class="shop__actions">
            <span class="shop__price">{{ formatTokens(clickUpgradePrice(upgrade.id)) }}</span>
            <UButton
              type="button"
              size="xs"
              color="neutral"
              :variant="tokensMicro >= clickUpgradePrice(upgrade.id) ? 'soft' : 'ghost'"
              :disabled="tokensMicro < clickUpgradePrice(upgrade.id)"
              :aria-label="`Buy ${upgrade.name}`"
              @click="emit('buy-click', upgrade.id)"
            >
              ×{{ upgrade.multiplier }}
            </UButton>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.shop {
  display: grid;
  gap: 1.6rem;
}

.shop__header h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 680;
  letter-spacing: -0.02em;
}

.shop__header p {
  margin: 0.3rem 0 0;
  color: var(--site-muted);
  font-size: 0.8rem;
  line-height: 1.5;
}

.shop__list,
.shop__upgrade-list {
  display: grid;
  gap: 0.45rem;
  margin: 0.9rem 0 0;
  padding: 0;
  list-style: none;
}

.shop__item,
.shop__upgrade {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--site-border);
  border-radius: 0.55rem;
  background: var(--site-bg);
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}

.shop__item.is-affordable,
.shop__upgrade.is-affordable {
  border-color: color-mix(in oklch, var(--site-accent) 34%, var(--site-border));
  background: color-mix(in oklch, var(--site-accent) 4%, var(--site-bg));
}

.shop__upgrade.is-owned {
  border-style: dashed;
  opacity: 0.72;
}

.shop__identity {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.65rem;
}

.shop__icon {
  width: 1rem;
  height: 1rem;
  margin-top: 0.15rem;
  flex: none;
  color: var(--site-faint);
}

.shop__text {
  display: grid;
  min-width: 0;
  gap: 0.12rem;
}

.shop__name {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  color: var(--site-ink);
  font-size: 0.86rem;
  font-weight: 640;
}

.shop__owned {
  padding: 0.02rem 0.35rem;
  border-radius: 999px;
  background: var(--site-surface-soft);
  color: var(--site-muted);
  font-size: 0.68rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.shop__blurb {
  color: var(--site-muted);
  font-size: 0.74rem;
  line-height: 1.45;
}

.shop__rate {
  color: var(--site-faint);
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
}

.shop__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.55rem;
}

.shop__price {
  color: var(--site-ink);
  font-size: 0.78rem;
  font-weight: 620;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.shop__buttons {
  display: flex;
  gap: 1px;
}

.shop__owned-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: color-mix(in oklch, var(--site-accent) 62%, var(--site-ink));
  font-size: 0.72rem;
  font-weight: 640;
}

.shop__owned-tag svg {
  width: 0.8rem;
  height: 0.8rem;
}

.shop__upgrades h3 {
  margin: 0;
  color: var(--site-faint);
  font-size: 0.68rem;
  font-weight: 720;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.shop__upgrades-note {
  margin: 0.3rem 0 0;
  color: var(--site-muted);
  font-size: 0.76rem;
  line-height: 1.5;
}

.shop__next {
  margin: 0.7rem 0 0;
  color: var(--site-faint);
  font-size: 0.72rem;
}

@media (max-width: 620px) {
  .shop__item,
  .shop__upgrade {
    align-items: stretch;
    flex-direction: column;
    gap: 0.6rem;
  }

  .shop__actions {
    justify-content: space-between;
  }
}
</style>
