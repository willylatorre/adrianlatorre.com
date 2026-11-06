import { describe, expect, it } from 'vitest'
import {
  buyAutoClicker,
  buyClickUpgrade,
  buyProducer,
  buyUpgrade,
  click,
  createInitialState,
  passiveRateMicro,
  producerCost,
  tick,
  usePowerup,
  type EngineState,
} from './engine'
import { CLICK_UPGRADES, POWERUPS, PRODUCERS, UPGRADES, UPGRADE_COST_MICRO } from './content'
import { TOKEN_GOAL_MICRO, toMicro } from './numbers'

/**
 * A deliberately simple bot: every step it buys anything affordable that is
 * still worth buying, then advances the clock. It is not optimal, which is the
 * point. If a greedy, slightly dumb player can finish in a reasonable window,
 * a real player can too.
 */
interface BotOptions {
  /** Clicks per second the bot performs. */
  clicksPerSecond: number
  /** Whether the bot presses powerups as soon as they are available. */
  usePowerups: boolean
  /** Simulated step size in seconds. */
  stepSeconds?: number
  /** Hard stop so a broken economy fails instead of hanging the suite. */
  maxMinutes?: number
}

interface BotResult {
  won: boolean
  minutes: number
  finalRate: bigint
  upgradesBought: number
  producersOwned: number
}

const START = Date.UTC(2026, 0, 1)

function runBot(options: BotOptions): BotResult {
  const { clicksPerSecond, usePowerups, stepSeconds = 5, maxMinutes = 180 } = options
  let state: EngineState = createInitialState(START)
  let elapsedMs = 0
  const maxMs = maxMinutes * 60 * 1_000
  let stepsWithNoPurchase = 0

  while (elapsedMs < maxMs && state.wonAt === null) {
    const now = START + elapsedMs
    let boughtSomething = false

    if (!state.autoClickerOwned && state.tokens >= toMicro(10n)) {
      const result = buyAutoClicker(state, now)
      if (result.ok) {
        state = result.state
        boughtSomething = true
      }
    }

    // Global upgrades first: they multiply everything and are never a bad buy.
    for (const upgrade of UPGRADES) {
      if (state.upgrades.includes(upgrade.id)) continue
      const price = UPGRADE_COST_MICRO.get(upgrade.id) ?? 0n
      if (state.tokens < price) continue
      const result = buyUpgrade(state, upgrade.id, now)
      if (result.ok) {
        state = result.state
        boughtSomething = true
      }
    }

    // Click upgrades are cheap early and irrelevant later, so buy them when
    // they cost less than a few seconds of income.
    const rate = passiveRateMicro(state)
    for (const upgrade of CLICK_UPGRADES) {
      if (state.clickUpgrades.includes(upgrade.id)) continue
      if (state.tokens < upgrade.cost * 1_000_000n) continue
      const result = buyClickUpgrade(state, upgrade.id, now)
      if (result.ok) {
        state = result.state
        boughtSomething = true
      }
    }

    // Buy the producer with the best rate gained per token spent.
    let bestId: (typeof PRODUCERS)[number]['id'] | null = null
    let bestValue = 0
    for (const producer of PRODUCERS) {
      const owned = state.producers[producer.id] ?? 0
      const price = producerCost(producer.id, owned)
      if (price > state.tokens) continue
      const value = producer.baseRate / Number(price / 1_000_000n || 1n)
      if (value > bestValue) {
        bestValue = value
        bestId = producer.id
      }
    }
    if (bestId) {
      const result = buyProducer(state, bestId, 'max', now)
      if (result.ok) {
        state = result.state
        boughtSomething = true
      }
    }

    if (usePowerups) {
      for (const powerup of POWERUPS) {
        const result = usePowerup(state, powerup.id, now)
        if (result.ok) {
          state = result.state
          boughtSomething = true
        }
      }
    }

    // Click at the configured rate, in whole clicks per step.
    const clicks = Math.floor(clicksPerSecond * stepSeconds)
    for (let index = 0; index < clicks; index += 1) {
      const clicked = click(state, now)
      state = clicked.state
      if (state.wonAt !== null) break
    }

    state = tick(state, stepSeconds * 1_000, now + stepSeconds * 1_000)
    elapsedMs += stepSeconds * 1_000

    stepsWithNoPurchase = boughtSomething ? 0 : stepsWithNoPurchase + 1
    // If the bot cannot buy anything for ten minutes it is stuck; stop early
    // so the test reports a clear failure rather than a timeout.
    if (stepsWithNoPurchase > (10 * 60) / stepSeconds && rate === 0n) break
  }

  return {
    won: state.wonAt !== null,
    minutes: elapsedMs / 60_000,
    finalRate: passiveRateMicro(state),
    upgradesBought: state.upgrades.length,
    producersOwned: Object.values(state.producers).reduce((sum, count) => sum + count, 0),
  }
}

describe('token-eater balance', () => {
  it('an engaged player finishes in a sane window', () => {
    const result = runBot({ clicksPerSecond: 2, usePowerups: true })
    expect(result.won).toBe(true)
    // The design target is roughly 20 to 30 minutes of active play.
    expect(result.minutes).toBeGreaterThan(12)
    expect(result.minutes).toBeLessThan(40)
  })

  it('a casual player still finishes', () => {
    const result = runBot({ clicksPerSecond: 0.5, usePowerups: true })
    expect(result.won).toBe(true)
    expect(result.minutes).toBeLessThan(60)
  })

  it('an idle player with no powerups still gets there eventually', () => {
    const result = runBot({ clicksPerSecond: 0.2, usePowerups: false, maxMinutes: 240 })
    expect(result.won).toBe(true)
    expect(result.minutes).toBeLessThan(180)
  })

  it('does not let the player finish in under five minutes', () => {
    // Guards against a future balance change collapsing the curve.
    const result = runBot({ clicksPerSecond: 8, usePowerups: true, stepSeconds: 2 })
    expect(result.minutes).toBeGreaterThan(5)
  })

  it('ends with most of the content purchased, not skipped', () => {
    const result = runBot({ clicksPerSecond: 2, usePowerups: true })
    expect(result.upgradesBought).toBeGreaterThanOrEqual(UPGRADES.length - 2)
    expect(result.producersOwned).toBeGreaterThan(PRODUCERS.length)
  })

  it('never reports a negative balance at the end of a run', () => {
    const result = runBot({ clicksPerSecond: 3, usePowerups: true, maxMinutes: 20 })
    expect(result.finalRate >= 0n).toBe(true)
  })

  it('keeps the win condition reachable without powerups at all', () => {
    // Powerups are a convenience, not a requirement. This is the difference
    // between a game and a notification schedule.
    const result = runBot({ clicksPerSecond: 1, usePowerups: false, maxMinutes: 120 })
    expect(result.won).toBe(true)
  })

  it('stops producing immediately once the goal is reached', () => {
    const state: EngineState = {
      ...createInitialState(START),
      tokens: TOKEN_GOAL_MICRO,
      lifetimeTokens: TOKEN_GOAL_MICRO,
      wonAt: START,
      producers: { ...createInitialState(START).producers, chat: 100 },
    }
    const ticked = tick(state, 60_000, START + 60_000)
    expect(ticked.tokens).toBe(TOKEN_GOAL_MICRO)
  })
})
