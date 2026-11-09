<script setup lang="ts">
import { computed } from 'vue'
import {
  AUTO_CLICKER,
  CLICK_UPGRADES,
  PRODUCERS,
  UPGRADES,
  type ClickUpgradeId,
  type ProducerId,
  type UpgradeId,
} from '../../features/token-eater/content'
import { UPGRADE_COST_MICRO, CLICK_UPGRADE_COST_MICRO } from '../../features/token-eater/content'
import { autoClickerCost, producerCost } from '../../features/token-eater/engine'
import { formatTokens } from '../../features/token-eater/numbers'

const props = withDefaults(
  defineProps<{
    tokensMicro: bigint
    producers: Record<ProducerId, number>
    upgrades: UpgradeId[]
    clickUpgrades: ClickUpgradeId[]
    autoClickers: number
    ratePerProducer: ReadonlyMap<ProducerId, bigint>
    mode?: 'all' | 'producers' | 'upgrades'
  }>(),
  {
    mode: 'all',
  },
)

const emit = defineEmits<{
  buy: [id: ProducerId, amount: number | 'max']
  'buy-upgrade': [id: UpgradeId]
  'buy-click': [id: ClickUpgradeId]
  'buy-auto-clicker': [amount: number | 'max']
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

function autoClickerPrice(owned = props.autoClickers): bigint {
  return autoClickerCost(owned)
}

function buyAutoClickers(mode: 'one' | 'ten' | 'max') {
  emit('buy-auto-clicker', mode === 'max' ? 'max' : mode === 'ten' ? 10 : 1)
}
</script>

<template>
  <section
    class="shop"
    :class="`shop--${mode}`"
    :aria-labelledby="mode === 'upgrades' ? 'upgrades-heading' : 'shop-heading'"
  >
    <header v-if="mode !== 'upgrades'" class="shop__header">
      <h2 id="shop-heading">Build capacity</h2>
      <p>Each purchase makes tokens faster. Prices rise 15% per unit.</p>
    </header>

    <ul v-if="mode !== 'upgrades'" class="shop__list">
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

    <div v-if="mode !== 'producers'" class="shop__upgrades shop__automation">
      <h3>Automation</h3>
      <p class="shop__upgrades-note">
        One intern costs ten tokens. Each new hire asks for a 10× raise.
      </p>
      <div
        class="shop__upgrade"
        :class="{
          'is-owned': autoClickers > 0,
          'is-affordable': tokensMicro >= autoClickerPrice(),
        }"
        data-auto-clicker
      >
        <div class="shop__identity">
          <UIcon :name="AUTO_CLICKER.icon" class="shop__icon" aria-hidden="true" />
          <div class="shop__text">
            <span class="shop__name">
              {{ AUTO_CLICKER.name }}
              <span v-if="autoClickers > 0" class="shop__owned">{{ autoClickers }}</span>
            </span>
            <span class="shop__blurb">{{ AUTO_CLICKER.blurb }}</span>
            <span class="shop__rate">One automatic click per second each</span>
          </div>
        </div>
        <div class="shop__actions">
          <span class="shop__price">{{ formatTokens(autoClickerPrice()) }}</span>
          <div class="shop__buttons">
            <UButton
              type="button"
              size="xs"
              color="neutral"
              variant="soft"
              :disabled="tokensMicro < autoClickerPrice()"
              aria-label="Hire one unsupervised intern"
              @click="buyAutoClickers('one')"
            >
              ×1
            </UButton>
            <UButton
              type="button"
              size="xs"
              color="neutral"
              variant="ghost"
              :disabled="tokensMicro < autoClickerPrice()"
              aria-label="Hire ten unsupervised interns"
              @click="buyAutoClickers('ten')"
            >
              ×10
            </UButton>
            <UButton
              type="button"
              size="xs"
              color="neutral"
              variant="ghost"
              :disabled="tokensMicro < autoClickerPrice()"
              aria-label="Hire as many unsupervised interns as possible"
              @click="buyAutoClickers('max')"
            >
              Max
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <div v-if="mode !== 'producers'" class="shop__upgrades">
      <h2 v-if="mode === 'upgrades'" id="upgrades-heading" class="sr-only">Upgrades</h2>
      <h3>Efficiency</h3>
      <p class="shop__upgrades-note">
        One-time multipliers. They apply to everything you already own.
      </p>
      <ul class="shop__upgrade-list">
        <li
          v-for="upgrade in UPGRADES"
          :key="upgrade.id"
          class="shop__upgrade"
          :class="{
            'is-owned': upgrades.includes(upgrade.id),
            'is-affordable':
              !upgrades.includes(upgrade.id) && tokensMicro >= upgradePrice(upgrade.id),
          }"
          :data-upgrade="upgrade.id"
          :aria-label="`${upgrade.name}. ${upgrade.blurb}`"
          :title="upgrade.blurb"
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
    </div>

    <div v-if="mode !== 'producers'" class="shop__upgrades">
      <h3>Clicking</h3>
      <p class="shop__upgrades-note">
        Clicks always earn at least 1% of your passive rate. These multiply that.
      </p>
      <ul class="shop__upgrade-list">
        <li
          v-for="upgrade in CLICK_UPGRADES"
          :key="upgrade.id"
          class="shop__upgrade"
          :class="{
            'is-owned': clickUpgrades.includes(upgrade.id),
            'is-affordable':
              !clickUpgrades.includes(upgrade.id) && tokensMicro >= clickUpgradePrice(upgrade.id),
          }"
          :data-click-upgrade="upgrade.id"
          :aria-label="`${upgrade.name}. ${upgrade.blurb}`"
          :title="upgrade.blurb"
        >
          <div class="shop__identity">
            <UIcon :name="upgrade.icon" class="shop__icon" aria-hidden="true" />
            <div class="shop__text">
              <span class="shop__name">
                {{ upgrade.name }}
                <span v-if="clickUpgrades.includes(upgrade.id)" class="shop__owned">Owned</span>
              </span>
              <span class="shop__blurb">{{ upgrade.blurb }}</span>
            </div>
          </div>
          <div class="shop__actions">
            <template v-if="clickUpgrades.includes(upgrade.id)">
              <span class="shop__owned-tag">
                <UIcon name="i-lucide-circle-check" aria-hidden="true" />
                Owned
              </span>
            </template>
            <template v-else>
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
            </template>
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

.shop--upgrades {
  gap: 1rem;
}

.shop--upgrades .shop__upgrade-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
}

.shop--upgrades .shop__upgrade {
  min-width: 0;
  padding: 0.48rem 0.55rem;
  gap: 0.4rem;
}

.shop--producers .shop__item,
.shop--upgrades .shop__upgrade {
  border: 0;
  border-bottom: 1px solid var(--site-border);
  border-radius: 0;
  background: transparent;
}

.shop--producers .shop__item {
  padding-inline: 0.15rem;
}

.shop--producers .shop__item.is-affordable,
.shop--upgrades .shop__upgrade.is-affordable {
  background: color-mix(in oklch, var(--site-accent) 5%, transparent);
}

.shop--upgrades .shop__identity {
  align-items: center;
  gap: 0.4rem;
}

.shop--upgrades .shop__icon {
  width: 0.85rem;
  height: 0.85rem;
}

.shop--upgrades .shop__name {
  font-size: 0.76rem;
}

.shop--upgrades .shop__blurb {
  display: none;
}

.shop--upgrades .shop__actions {
  gap: 0.3rem;
}

.shop--upgrades .shop__price {
  font-size: 0.7rem;
}

.shop__main-heading {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 680;
  letter-spacing: -0.02em;
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

  .shop--upgrades .shop__upgrade-list {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
