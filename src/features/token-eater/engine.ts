import {
  AUTO_CLICKER,
  CLICK_RATE_DIVISOR,
  CLICK_UPGRADE_BY_ID,
  CLICK_UPGRADE_COST_MICRO,
  MILESTONES,
  POWERUP_BY_ID,
  PRODUCERS,
  PRODUCER_BASE_COST_MICRO,
  PRODUCER_BASE_RATE_MICRO,
  UPGRADE_BY_ID,
  UPGRADE_COST_MICRO,
  type ClickUpgradeId,
  type PowerupId,
  type ProducerId,
  type UpgradeId,
} from './content'
import {
  costAt,
  earningsFor,
  progressTowardGoal,
  scaleByPower,
  TOKEN_GOAL_MICRO,
  toMicro,
} from './numbers'

/**
 * The simulation. No Vue, no DOM, no clock of its own: every function takes the
 * elapsed time as an argument. That keeps it deterministic enough to replay in
 * a test and fast enough to run every animation frame.
 */

/** Engine-facing save shape. All currency fields are micro-token strings. */
export interface EngineState {
  /** Tokens available to spend, in micro-tokens. */
  tokens: bigint
  /** Every token ever earned, in micro-tokens. Drives unlocks and the goal. */
  lifetimeTokens: bigint
  /** How many of each producer are owned, keyed by producer id. */
  producers: Record<ProducerId, number>
  /** One-time global upgrades already bought. */
  upgrades: UpgradeId[]
  /** Click upgrades already bought. */
  clickUpgrades: ClickUpgradeId[]
  /** Total clicks, used for a small piece of flavour copy. */
  clicks: number
  /** Number of interns, each clicking once per second. */
  autoClickers: number
  /** Milliseconds accumulated toward the interns' next automatic click. */
  autoClickRemainderMs: number
  /** Active powerup cooldowns, as epoch milliseconds when ready. */
  powerupReadyAt: Partial<Record<PowerupId, number>>
  /** End timestamp of an active multiplier powerup, if any. */
  boostEndsAt: number | null
  /** Multiplier of the active boost. */
  boostMultiplier: number
  /** Epoch milliseconds of the last simulated moment. */
  lastTickAt: number
  /** Epoch milliseconds when this run started. */
  startedAt: number
  /** Epoch milliseconds when the goal was reached, if it was. */
  wonAt: number | null
}

export interface DerivedStats {
  /** Passive production in micro-tokens per second, including upgrades. */
  rateMicroPerSecond: bigint
  /** Tokens earned by one click, in micro-tokens. */
  clickYieldMicro: bigint
  /** Multiplier from bought upgrades. */
  upgradeMultiplier: number
  /** Multiplier from the active boost, or 1. */
  boostMultiplier: number
  /** Production with the boost applied, in micro-tokens per second. */
  effectiveRateMicroPerSecond: bigint
  /** 0..1 progress toward the win condition. */
  progress: number
  /** The next milestone the player has not reached, if any. */
  nextMilestone: (typeof MILESTONES)[number] | null
}

export function createInitialState(now = 0): EngineState {
  return {
    tokens: 0n,
    lifetimeTokens: 0n,
    producers: Object.fromEntries(PRODUCERS.map((item) => [item.id, 0])) as Record<
      ProducerId,
      number
    >,
    upgrades: [],
    clickUpgrades: [],
    clicks: 0,
    autoClickers: 0,
    autoClickRemainderMs: 0,
    powerupReadyAt: {},
    boostEndsAt: null,
    boostMultiplier: 1,
    lastTickAt: now,
    startedAt: now,
    wonAt: null,
  }
}

export function upgradeMultiplierOf(state: EngineState): number {
  let multiplier = 1
  for (const id of state.upgrades) {
    const definition = UPGRADE_BY_ID.get(id)
    if (definition) multiplier *= definition.multiplier
  }
  return multiplier
}

export function clickMultiplierOf(state: EngineState): number {
  let multiplier = 1
  for (const id of state.clickUpgrades) {
    const definition = CLICK_UPGRADE_BY_ID.get(id)
    if (definition) multiplier *= definition.multiplier
  }
  return multiplier
}

/** Price of the next unit of a producer, in micro-tokens. */
export function producerCost(id: ProducerId, owned: number): bigint {
  const base = PRODUCER_BASE_COST_MICRO.get(id)
  if (!base) return 0n
  return costAt(base, owned)
}

/** Each additional intern costs ten times as much as the previous hire. */
export function autoClickerCost(owned: number): bigint {
  return scaleByPower(
    toMicro(AUTO_CLICKER.cost),
    AUTO_CLICKER.costGrowthNumerator,
    AUTO_CLICKER.costGrowthDenominator,
    owned,
  )
}

/** Production from owned producers, before automation, in micro/s. */
function producerRateMicro(state: EngineState): bigint {
  let total = 0n
  for (const producer of PRODUCERS) {
    const owned = state.producers[producer.id] ?? 0
    if (owned <= 0) continue
    const base = PRODUCER_BASE_RATE_MICRO.get(producer.id) ?? 0n
    total += base * BigInt(owned)
  }
  return total * BigInt(upgradeMultiplierOf(state))
}

/** One intern runs one click per second, using normal click upgrades. */
export function automaticClickYieldMicro(state: EngineState): bigint {
  const producerRate = producerRateMicro(state)
  const floor = toMicro(1n)
  const scaled = producerRate / CLICK_RATE_DIVISOR
  const base = scaled > floor ? scaled : floor
  return base * BigInt(clickMultiplierOf(state))
}

/** Passive rate includes producers and the intern when it is owned. */
export function passiveRateMicro(state: EngineState): bigint {
  const producers = producerRateMicro(state)
  if (state.autoClickers <= 0) return producers
  const automated =
    (automaticClickYieldMicro(state) * BigInt(state.autoClickers) * 1_000n) /
    BigInt(AUTO_CLICKER.intervalMs)
  return producers + automated
}

/**
 * A click earns at least one micro-token, and otherwise one percent of the
 * passive rate, multiplied by the click upgrades. This is the standard
 * incremental trick that keeps clicking relevant without ever competing with
 * a mature economy.
 */
export function clickYieldMicro(state: EngineState): bigint {
  // One whole token is the floor, so a click always visibly does something.
  const floor = toMicro(1n)
  const scaled = passiveRateMicro(state) / CLICK_RATE_DIVISOR
  const base = scaled > floor ? scaled : floor
  return base * BigInt(clickMultiplierOf(state))
}

export function boostMultiplierAt(state: EngineState, now: number): number {
  if (state.boostEndsAt === null) return 1
  if (now >= state.boostEndsAt) return 1
  return state.boostMultiplier > 0 ? state.boostMultiplier : 1
}

export function deriveStats(state: EngineState, now: number): DerivedStats {
  const rate = passiveRateMicro(state)
  const boost = boostMultiplierAt(state, now)
  const effectiveRate = rate * BigInt(boost)
  const reached = state.lifetimeTokens
  const nextMilestone = MILESTONES.find((milestone) => reached < toMicro(milestone.at)) ?? null
  return {
    rateMicroPerSecond: rate,
    clickYieldMicro: clickYieldMicro(state),
    upgradeMultiplier: upgradeMultiplierOf(state),
    boostMultiplier: boost,
    effectiveRateMicroPerSecond: effectiveRate,
    progress: progressTowardGoal(reached),
    nextMilestone,
  }
}

/**
 * Advances the simulation by `elapsedMs`. Returns a new state; the caller
 * decides when to persist. Elapsed time is clamped by the caller for offline
 * progress, not here, so the engine stays honest.
 */
export function tick(state: EngineState, elapsedMs: number, now: number): EngineState {
  if (state.wonAt !== null) {
    return { ...state, lastTickAt: now }
  }

  const seconds = Math.max(0, elapsedMs)
  // Producer income is continuous. The intern's clicks are applied as discrete
  // events below, so do not also add its averaged rate here.
  const rate = producerRateMicro(state)
  const boost = boostMultiplierAt(state, now)
  const boostedRate = rate * BigInt(boost)
  const productionGained = earningsFor(boostedRate, seconds)
  const tickMs = Math.max(0, Math.round(seconds))
  const autoElapsed = state.autoClickers > 0 ? state.autoClickRemainderMs + tickMs : 0
  const autoPeriods = state.autoClickers > 0 ? Math.floor(autoElapsed / AUTO_CLICKER.intervalMs) : 0
  const autoClicks = autoPeriods * state.autoClickers
  const autoClickRemainderMs = state.autoClickers > 0 ? autoElapsed % AUTO_CLICKER.intervalMs : 0
  const automatedClicks = BigInt(autoClicks)
  const autoGained =
    state.autoClickers > 0 ? automaticClickYieldMicro(state) * automatedClicks * BigInt(boost) : 0n
  const gained = productionGained + autoGained

  const lifetimeTokens = state.lifetimeTokens + gained
  const tokens = state.tokens + gained
  const wonAt = state.wonAt === null && lifetimeTokens >= TOKEN_GOAL_MICRO ? now : state.wonAt

  return {
    ...state,
    tokens,
    lifetimeTokens,
    boostEndsAt: state.boostEndsAt !== null && now >= state.boostEndsAt ? null : state.boostEndsAt,
    boostMultiplier:
      state.boostEndsAt !== null && now >= state.boostEndsAt ? 1 : state.boostMultiplier,
    autoClickRemainderMs,
    clicks: state.clicks + autoClicks,
    lastTickAt: now,
    wonAt,
  }
}

export type PurchaseResult =
  | { ok: true; state: EngineState }
  | { ok: false; reason: 'insufficient' | 'already-owned' | 'unknown' | 'won' }

export function buyProducer(
  state: EngineState,
  id: ProducerId,
  amount: number | 'max',
  now: number,
): PurchaseResult {
  if (state.wonAt !== null) return { ok: false, reason: 'won' }
  const definition = PRODUCERS.find((item) => item.id === id)
  if (!definition) return { ok: false, reason: 'unknown' }

  let tokens = state.tokens
  let owned = state.producers[id] ?? 0
  let bought = 0

  if (amount === 'max') {
    // Buy while affordable. The loop is bounded by the growing price, so it
    // cannot spin forever even at large balances.
    for (;;) {
      const price = producerCost(id, owned)
      if (price > tokens) break
      tokens -= price
      owned += 1
      bought += 1
      if (bought > 10_000) break
    }
  } else {
    const count = Math.max(0, Math.floor(amount))
    for (let index = 0; index < count; index += 1) {
      const price = producerCost(id, owned)
      if (price > tokens) break
      tokens -= price
      owned += 1
      bought += 1
    }
  }

  if (bought === 0) return { ok: false, reason: 'insufficient' }

  const next: EngineState = {
    ...state,
    tokens,
    producers: { ...state.producers, [id]: owned },
    lastTickAt: now,
  }
  return { ok: true, state: next }
}

/** Purchases one or more interns; each contributes one automatic click per second. */
export function buyAutoClicker(
  state: EngineState,
  amount: number | 'max',
  now: number,
): PurchaseResult {
  if (state.wonAt !== null) return { ok: false, reason: 'won' }
  let tokens = state.tokens
  let owned = state.autoClickers
  let bought = 0

  if (amount === 'max') {
    while (bought < 10_000) {
      const price = autoClickerCost(owned)
      if (price > tokens) break
      tokens -= price
      owned += 1
      bought += 1
    }
  } else {
    const count = Math.max(0, Math.floor(amount))
    for (let index = 0; index < count; index += 1) {
      const price = autoClickerCost(owned)
      if (price > tokens) break
      tokens -= price
      owned += 1
      bought += 1
    }
  }

  if (bought === 0) return { ok: false, reason: 'insufficient' }

  return {
    ok: true,
    state: {
      ...state,
      tokens,
      autoClickers: owned,
      lastTickAt: now,
    },
  }
}

export function buyUpgrade(state: EngineState, id: UpgradeId, now: number): PurchaseResult {
  if (state.wonAt !== null) return { ok: false, reason: 'won' }
  const definition = UPGRADE_BY_ID.get(id)
  if (!definition) return { ok: false, reason: 'unknown' }
  if (state.upgrades.includes(id)) return { ok: false, reason: 'already-owned' }
  const price = UPGRADE_COST_MICRO.get(id) ?? 0n
  if (state.tokens < price) return { ok: false, reason: 'insufficient' }

  return {
    ok: true,
    state: {
      ...state,
      tokens: state.tokens - price,
      upgrades: [...state.upgrades, id],
      lastTickAt: now,
    },
  }
}

export function buyClickUpgrade(
  state: EngineState,
  id: ClickUpgradeId,
  now: number,
): PurchaseResult {
  if (state.wonAt !== null) return { ok: false, reason: 'won' }
  const definition = CLICK_UPGRADE_BY_ID.get(id)
  if (!definition) return { ok: false, reason: 'unknown' }
  if (state.clickUpgrades.includes(id)) return { ok: false, reason: 'already-owned' }
  const price = CLICK_UPGRADE_COST_MICRO.get(id) ?? 0n
  if (state.tokens < price) return { ok: false, reason: 'insufficient' }

  return {
    ok: true,
    state: {
      ...state,
      tokens: state.tokens - price,
      clickUpgrades: [...state.clickUpgrades, id],
      lastTickAt: now,
    },
  }
}

export function isPowerupUnlocked(state: EngineState, id: PowerupId): boolean {
  const definition = POWERUP_BY_ID.get(id)
  if (!definition) return false
  return state.lifetimeTokens >= toMicro(definition.unlockAt)
}

export function powerupCooldownRemainingMs(state: EngineState, id: PowerupId, now: number): number {
  const readyAt = state.powerupReadyAt[id]
  if (!readyAt) return 0
  return Math.max(0, readyAt - now)
}

export type PowerupResult =
  | { ok: true; state: EngineState; gainedMicro: bigint }
  | { ok: false; reason: 'locked' | 'cooldown' | 'unknown' | 'won' }

export function usePowerup(state: EngineState, id: PowerupId, now: number): PowerupResult {
  if (state.wonAt !== null) return { ok: false, reason: 'won' }
  const definition = POWERUP_BY_ID.get(id)
  if (!definition) return { ok: false, reason: 'unknown' }
  if (!isPowerupUnlocked(state, id)) return { ok: false, reason: 'locked' }
  if (powerupCooldownRemainingMs(state, id, now) > 0) {
    return { ok: false, reason: 'cooldown' }
  }

  const readyAt = now + definition.cooldownSeconds * 1_000
  const base: EngineState = {
    ...state,
    powerupReadyAt: { ...state.powerupReadyAt, [id]: readyAt },
    lastTickAt: now,
  }

  if (definition.kind === 'instant') {
    const rate = passiveRateMicro(state)
    const gained = rate * BigInt(definition.secondsOfProduction ?? 0)
    const lifetimeTokens = base.lifetimeTokens + gained
    return {
      ok: true,
      gainedMicro: gained,
      state: {
        ...base,
        tokens: base.tokens + gained,
        lifetimeTokens,
        wonAt: lifetimeTokens >= TOKEN_GOAL_MICRO ? now : base.wonAt,
      },
    }
  }

  return {
    ok: true,
    gainedMicro: 0n,
    state: {
      ...base,
      boostEndsAt: now + (definition.durationSeconds ?? 0) * 1_000,
      boostMultiplier: definition.multiplier ?? 1,
    },
  }
}

export interface ClickResult {
  state: EngineState
  gainedMicro: bigint
  /** True when this click caused the win. */
  won: boolean
}

export function click(state: EngineState, now: number): ClickResult {
  if (state.wonAt !== null) return { state, gainedMicro: 0n, won: false }
  const gained = clickYieldMicro(state)
  const lifetimeTokens = state.lifetimeTokens + gained
  const won = lifetimeTokens >= TOKEN_GOAL_MICRO
  return {
    gainedMicro: gained,
    won,
    state: {
      ...state,
      tokens: state.tokens + gained,
      lifetimeTokens,
      clicks: state.clicks + 1,
      lastTickAt: now,
      wonAt: won ? now : state.wonAt,
    },
  }
}
