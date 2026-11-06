import { describe, expect, it } from 'vitest'
import {
  buyClickUpgrade,
  buyAutoClicker,
  buyProducer,
  buyUpgrade,
  click,
  clickYieldMicro,
  autoClickerCost,
  createInitialState,
  deriveStats,
  passiveRateMicro,
  producerCost,
  tick,
  usePowerup,
  isPowerupUnlocked,
  powerupCooldownRemainingMs,
} from './engine'
import {
  PRODUCERS,
  POWERUPS,
  UPGRADES,
  UPGRADE_COST_MICRO,
  CLICK_UPGRADE_COST_MICRO,
} from './content'
import { TOKEN_GOAL_MICRO, toMicro, toTokens } from './numbers'

const AT = 1_700_000_000_000

function richState() {
  const state = createInitialState(AT)
  return { ...state, tokens: toMicro(10_000_000_000n), lifetimeTokens: toMicro(10_000_000_000n) }
}

describe('token-eater engine', () => {
  it('starts with nothing owned and no income', () => {
    const state = createInitialState(AT)
    expect(passiveRateMicro(state)).toBe(0n)
    expect(clickYieldMicro(state)).toBe(toMicro(1n))
    expect(state.autoClickers).toBe(0)
    expect(deriveStats(state, AT).progress).toBe(0)
  })

  it('buys the unsupervised intern for ten tokens', () => {
    const state = {
      ...createInitialState(AT),
      tokens: toMicro(10n),
      lifetimeTokens: toMicro(10n),
    }
    const result = buyAutoClicker(state, 1, AT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.tokens).toBe(0n)
    expect(result.state.autoClickers).toBe(1)
    expect(passiveRateMicro(result.state)).toBe(1_000_000n)
    expect(autoClickerCost(1)).toBe(toMicro(100n))
    expect(autoClickerCost(2)).toBe(toMicro(1_000n))
  })

  it('does not buy the intern before the ten-token price', () => {
    const result = buyAutoClicker({ ...createInitialState(AT), tokens: toMicro(9n) }, 1, AT)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('insufficient')
  })

  it('auto-clicks once after one second and retains partial time between ticks', () => {
    const bought = buyAutoClicker(
      {
        ...createInitialState(AT),
        tokens: toMicro(10n),
        lifetimeTokens: toMicro(10n),
      },
      1,
      AT,
    )
    if (!bought.ok) throw new Error('setup failed')

    const first = tick(bought.state, 400, AT + 400)
    expect(first.tokens).toBe(0n)
    expect(first.autoClickRemainderMs).toBe(400)

    const second = tick(first, 600, AT + 1_000)
    expect(second.tokens).toBe(toMicro(1n))
    expect(second.lifetimeTokens).toBe(toMicro(11n))
    expect(second.clicks).toBe(1)
    expect(second.autoClickRemainderMs).toBe(0)
  })

  it('allows multiple hires and each adds one click per second', () => {
    const hired = buyAutoClicker(
      {
        ...createInitialState(AT),
        tokens: toMicro(500n),
        lifetimeTokens: toMicro(500n),
      },
      'max',
      AT,
    )
    if (!hired.ok) throw new Error('setup failed')
    expect(hired.state.autoClickers).toBeGreaterThan(1)

    const afterSecond = tick(hired.state, 1_000, AT + 1_000)
    expect(afterSecond.clicks).toBe(hired.state.autoClickers)
    expect(afterSecond.tokens).toBe(hired.state.tokens + toMicro(BigInt(hired.state.autoClickers)))
  })

  it('saves a finished run without allowing the intern to click again', () => {
    const state = {
      ...createInitialState(AT),
      autoClickers: 1,
      wonAt: AT,
      tokens: TOKEN_GOAL_MICRO,
      lifetimeTokens: TOKEN_GOAL_MICRO,
    }
    const result = tick(state, 10_000, AT + 10_000)
    expect(result.tokens).toBe(TOKEN_GOAL_MICRO)
    expect(result.clicks).toBe(0)
  })

  it('prices each successive unit above the last', () => {
    const first = producerCost('autocomplete', 0)
    const second = producerCost('autocomplete', 1)
    const third = producerCost('autocomplete', 2)
    expect(first).toBe(toMicro(30n))
    expect(second).toBe(34_500_000n)
    expect(third).toBeGreaterThan(second)
  })

  it('refuses a purchase the player cannot afford', () => {
    const state = createInitialState(AT)
    const result = buyProducer(state, 'autocomplete', 1, AT)
    expect(result.ok).toBe(false)
    expect(state.producers.autocomplete).toBe(0)
  })

  it('buys a producer and immediately earns at its rate', () => {
    const bought = buyProducer(richState(), 'autocomplete', 1, AT)
    expect(bought.ok).toBe(true)
    if (!bought.ok) return
    expect(bought.state.producers.autocomplete).toBe(1)
    expect(passiveRateMicro(bought.state)).toBe(500_000n)
  })

  it('buys the maximum affordable amount and stops at the balance', () => {
    const state = { ...createInitialState(AT), tokens: toMicro(1_000n) }
    const result = buyProducer(state, 'autocomplete', 'max', AT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // 30, then 34.5, then 39.675 ... only a few fit inside 1,000 tokens.
    expect(result.state.producers.autocomplete).toBeGreaterThan(1)
    expect(result.state.tokens).toBeGreaterThanOrEqual(0n)
    const nextPrice = producerCost('autocomplete', result.state.producers.autocomplete)
    expect(nextPrice).toBeGreaterThan(result.state.tokens)
  })

  it('never produces a negative balance from a max purchase', () => {
    const state = { ...createInitialState(AT), tokens: 0n }
    const result = buyProducer(state, 'autocomplete', 'max', AT)
    expect(result.ok).toBe(false)
    expect(state.tokens).toBe(0n)
  })

  it('applies a global upgrade multiplier to every producer', () => {
    const owned = buyProducer(richState(), 'autocomplete', 1, AT)
    if (!owned.ok) throw new Error('setup failed')
    const rateBefore = passiveRateMicro(owned.state)
    const upgraded = buyUpgrade(owned.state, 'batching', AT)
    expect(upgraded.ok).toBe(true)
    if (!upgraded.ok) return
    expect(passiveRateMicro(upgraded.state)).toBe(rateBefore * 2n)
  })

  it('cannot buy the same upgrade twice', () => {
    const owned = buyUpgrade(richState(), 'batching', AT)
    if (!owned.ok) throw new Error('setup failed')
    const again = buyUpgrade(owned.state, 'batching', AT)
    expect(again.ok).toBe(false)
    if (again.ok) return
    expect(again.reason).toBe('already-owned')
  })

  it('charges the upgrade price exactly once', () => {
    const state = richState()
    const price = UPGRADE_COST_MICRO.get('batching')!
    const result = buyUpgrade(state, 'batching', AT)
    if (!result.ok) throw new Error('expected purchase')
    expect(result.state.tokens).toBe(state.tokens - price)
  })

  it('raises click yield with the one percent floor', () => {
    const state = createInitialState(AT)
    expect(clickYieldMicro(state)).toBe(toMicro(1n))

    const one = buyProducer({ ...state, tokens: toMicro(1_000n) }, 'autocomplete', 1, AT)
    if (!one.ok) throw new Error('setup failed')
    // 0.5 tokens/s => 0.005 tokens per click, below the floor of 1 token.
    expect(clickYieldMicro(one.state)).toBe(toMicro(1n))
  })

  it('scales click yield with passive production once it clears the floor', () => {
    const state = richState()
    const many = buyProducer(state, 'chat', 20, AT)
    if (!many.ok) throw new Error('setup failed')
    // 20 chats at 11 tokens/s = 220 tokens/s, so 1% is 2.2 tokens per click,
    // which is above the one-token floor.
    const expected = passiveRateMicro(many.state) / 100n
    expect(expected).toBeGreaterThan(toMicro(1n))
    expect(clickYieldMicro(many.state)).toBe(expected)
  })

  it('keeps the floor while passive production is still tiny', () => {
    const state = richState()
    const one = buyProducer(state, 'autocomplete', 1, AT)
    if (!one.ok) throw new Error('setup failed')
    // 0.5 tokens/s means 0.005 tokens per click, far below one token.
    expect(passiveRateMicro(one.state) / 100n).toBeLessThan(toMicro(1n))
    expect(clickYieldMicro(one.state)).toBe(toMicro(1n))
  })

  it('multiplies click yield with click upgrades', () => {
    const state = richState()
    const base = clickYieldMicro(state)
    const bought = buyClickUpgrade(state, 'spoon', AT)
    if (!bought.ok) throw new Error('setup failed')
    expect(clickYieldMicro(bought.state)).toBe(base * 3n)
  })

  it('ticks at the passive rate and preserves fractions', () => {
    const bought = buyProducer(richState(), 'autocomplete', 1, AT)
    if (!bought.ok) throw new Error('setup failed')
    const ticked = tick(bought.state, 1_000, AT + 1_000)
    expect(ticked.tokens - bought.state.tokens).toBe(500_000n)
    expect(ticked.lifetimeTokens - bought.state.lifetimeTokens).toBe(500_000n)
  })

  it('does not tick after the win', () => {
    const won = {
      ...createInitialState(AT),
      wonAt: AT,
      lifetimeTokens: TOKEN_GOAL_MICRO,
      tokens: 0n,
    }
    const ticked = tick(won, 60_000, AT + 60_000)
    expect(ticked.tokens).toBe(0n)
  })

  it('wins exactly when lifetime tokens reach the goal', () => {
    // One token short, and a floor click is exactly one token.
    const nearly = {
      ...createInitialState(AT),
      tokens: TOKEN_GOAL_MICRO - toMicro(1n),
      lifetimeTokens: TOKEN_GOAL_MICRO - toMicro(1n),
    }
    const clicked = click(nearly, AT)
    expect(clicked.won).toBe(true)
    expect(clicked.state.wonAt).toBe(AT)
    expect(clicked.state.lifetimeTokens).toBe(TOKEN_GOAL_MICRO)
  })

  it('does not win before the goal is reached', () => {
    const nearly = {
      ...createInitialState(AT),
      tokens: TOKEN_GOAL_MICRO - toMicro(2n),
      lifetimeTokens: TOKEN_GOAL_MICRO - toMicro(2n),
    }
    const clicked = click(nearly, AT)
    expect(clicked.won).toBe(false)
    expect(clicked.state.wonAt).toBeNull()
  })

  it('adds exactly one token per click at the floor', () => {
    const state = createInitialState(AT)
    const clicked = click(state, AT)
    expect(clicked.gainedMicro).toBe(toMicro(1n))
    expect(toTokens(clicked.state.tokens)).toBe(1n)
    expect(clicked.state.clicks).toBe(1)
  })

  it('unlocks powerups on lifetime earnings only', () => {
    const state = createInitialState(AT)
    expect(isPowerupUnlocked(state, 'cache-hit')).toBe(false)
    const earned = { ...state, lifetimeTokens: toMicro(2_000n) }
    expect(isPowerupUnlocked(earned, 'cache-hit')).toBe(true)
  })

  it('pays an instant powerup at the passive rate', () => {
    const owned = buyProducer(richState(), 'chat', 10, AT)
    if (!owned.ok) throw new Error('setup failed')
    const ready = { ...owned.state, lifetimeTokens: toMicro(100_000n) }
    const rate = passiveRateMicro(ready)
    const result = usePowerup(ready, 'cache-hit', AT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.gainedMicro).toBe(rate * 30n)
    expect(result.state.tokens).toBe(ready.tokens + rate * 30n)
  })

  it('applies a cooldown after an instant powerup', () => {
    const ready = { ...richState(), lifetimeTokens: toMicro(100_000n) }
    const used = usePowerup(ready, 'cache-hit', AT)
    if (!used.ok) throw new Error('setup failed')
    expect(powerupCooldownRemainingMs(used.state, 'cache-hit', AT)).toBe(90_000)

    const blocked = usePowerup(used.state, 'cache-hit', AT + 1_000)
    expect(blocked.ok).toBe(false)
    if (blocked.ok) return
    expect(blocked.reason).toBe('cooldown')

    const later = usePowerup(used.state, 'cache-hit', AT + 90_000)
    expect(later.ok).toBe(true)
  })

  it('reports a locked powerup rather than silently failing', () => {
    const result = usePowerup(createInitialState(AT), 'cache-hit', AT)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('locked')
  })

  it('starts a multiplier boost that expires on schedule', () => {
    const ready = { ...richState(), lifetimeTokens: toMicro(10_000_000n) }
    const used = usePowerup(ready, 'overclock', AT)
    if (!used.ok) throw new Error('setup failed')
    expect(used.state.boostEndsAt).toBe(AT + 20_000)

    const statsDuring = deriveStats(used.state, AT + 5_000)
    expect(statsDuring.boostMultiplier).toBe(3)
    expect(statsDuring.effectiveRateMicroPerSecond).toBe(statsDuring.rateMicroPerSecond * 3n)

    const statsAfter = deriveStats(used.state, AT + 21_000)
    expect(statsAfter.boostMultiplier).toBe(1)
  })

  it('ticks with the boost applied, then drops back', () => {
    const ready = buyProducer(
      { ...richState(), lifetimeTokens: toMicro(10_000_000n) },
      'chat',
      5,
      AT,
    )
    if (!ready.ok) throw new Error('setup failed')

    const boosted = usePowerup(ready.state, 'overclock', AT)
    if (!boosted.ok) throw new Error('setup failed')

    const withBoost = tick(boosted.state, 1_000, AT + 1_000)
    const baseline = tick(ready.state, 1_000, AT + 1_000)

    expect(withBoost.tokens - boosted.state.tokens).toBe(
      (baseline.tokens - ready.state.tokens) * 3n,
    )

    // Once the boost window closes, production returns to normal.
    const afterBoost = tick(boosted.state, 1_000, AT + 21_000)
    expect(afterBoost.tokens - boosted.state.tokens).toBe(baseline.tokens - ready.state.tokens)
  })

  it('exposes the next unowned producer as a hint', () => {
    const state = richState()
    const bought = buyProducer(state, 'autocomplete', 1, AT)
    if (!bought.ok) throw new Error('setup failed')
    // The cheapest unowned tier is still chat even though autocomplete is owned.
    const unowned = PRODUCERS.find((item) => (bought.state.producers[item.id] ?? 0) === 0)
    expect(unowned?.id).toBe('chat')
  })

  it('keeps every catalog price within BigInt range', () => {
    // A number literal above 2^53 would be silently rounded. The catalog uses
    // BigInt, so this test just guards the invariant that nobody switched one
    // back to a number by accident.
    for (const producer of PRODUCERS) {
      expect(typeof producer.baseCost).toBe('bigint')
    }
    for (const upgrade of UPGRADES) {
      expect(typeof upgrade.cost).toBe('bigint')
    }
  })

  it('prices the final tier above Number.MAX_SAFE_INTEGER', () => {
    const final = PRODUCERS[PRODUCERS.length - 1]!
    expect(final.baseCost > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true)
  })

  it('has a goal that a double cannot represent', () => {
    expect(TOKEN_GOAL_MICRO > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true)
    expect(Number(TOKEN_GOAL_MICRO)).not.toBe(TOKEN_GOAL_MICRO)
  })

  it('keeps powerups ordered by unlock cost', () => {
    const unlocks = POWERUPS.map((powerup) => powerup.unlockAt)
    const sorted = [...unlocks].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    expect(unlocks).toEqual(sorted)
  })

  it('keeps click upgrades priced in ascending order', () => {
    const costs = [...CLICK_UPGRADE_COST_MICRO.values()]
    const sorted = [...costs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    expect(costs).toEqual(sorted)
  })
})
