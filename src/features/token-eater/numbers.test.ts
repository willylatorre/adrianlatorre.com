import { describe, expect, it } from 'vitest'
import {
  costAt,
  earningsFor,
  formatDuration,
  formatTokens,
  groupDigits,
  MICRO_PER_TOKEN,
  progressTowardGoal,
  rateToMicro,
  scaleByPower,
  TOKEN_GOAL,
  TOKEN_GOAL_MICRO,
  toMicro,
  toTokens,
} from './numbers'

describe('big-number primitives', () => {
  it('cannot round-trip the goal through a plain number', () => {
    // This is the whole reason the game uses BigInt. If this ever passes,
    // someone has changed the goal to something a double can hold and the
    // article's central claim is no longer true.
    expect(TOKEN_GOAL === BigInt(1e18)).toBe(false)
    expect(TOKEN_GOAL).toBe(999_999_999_999_999_999n)
    expect(Number(TOKEN_GOAL)).toBe(1e18)
  })

  it('loses units when adding one to a large double', () => {
    const asNumber = 1e18
    expect(asNumber + 1 === asNumber).toBe(true)
    expect(TOKEN_GOAL + 1n === TOKEN_GOAL).toBe(false)
  })

  it('keeps sub-token rates exact by storing micro-tokens', () => {
    expect(rateToMicro(0.5)).toBe(500_000n)
    expect(toTokens(500_000n)).toBe(0n)
    expect(earningsFor(500_000n, 1_000)).toBe(500_000n)
    expect(earningsFor(500_000n, 2_000)).toBe(1_000_000n)
  })

  it('accumulates a slow rate without drift', () => {
    // Half a token per second for ten minutes is exactly 300 tokens.
    let total = 0n
    for (let second = 0; second < 600; second += 1) {
      total += earningsFor(500_000n, 1_000)
    }
    expect(toTokens(total)).toBe(300n)
  })

  it('grows cost geometrically from an exact fraction', () => {
    const base = toMicro(100n)
    expect(costAt(base, 0)).toBe(base)
    expect(costAt(base, 1)).toBe(115_000_000n)
    // Two purchases compound: 100 * 1.15 * 1.15 = 132.25
    expect(costAt(base, 2)).toBe(132_250_000n)
  })

  it('applies a power without floating point drift', () => {
    const base = 1_000n
    expect(scaleByPower(base, 115n, 100n, 0)).toBe(1_000n)
    expect(scaleByPower(base, 115n, 100n, 3)).toBe(
      (1_000n * 115n * 115n * 115n) / (100n * 100n * 100n),
    )
  })

  it('formats compact numbers past what Intl handles well', () => {
    expect(formatTokens(0n)).toBe('0')
    expect(formatTokens(toMicro(999n))).toBe('999')
    expect(formatTokens(toMicro(1_000n))).toBe('1K')
    expect(formatTokens(toMicro(1_234n))).toBe('1.23K')
    expect(formatTokens(toMicro(1_000_000n))).toBe('1M')
    expect(formatTokens(toMicro(3_420_000_000_000n))).toBe('3.42T')
    expect(formatTokens(TOKEN_GOAL_MICRO)).toBe('999.99Qa')
  })

  it('keeps fractions visible below one token', () => {
    // A rate of 0.5 tokens per second must not render as "0/s".
    expect(formatTokens(500_000n, { fractional: true })).toBe('0.5')
    expect(formatTokens(10_000n, { fractional: true })).toBe('0.01')
    expect(formatTokens(1_000n, { fractional: true })).toBe('<0.01')
    expect(formatTokens(1_000_000n, { fractional: true })).toBe('1')
    expect(formatTokens(0n, { fractional: true })).toBe('0')
  })

  it('never prints a value larger than the goal as if it were the goal', () => {
    const overGoal = TOKEN_GOAL_MICRO + toMicro(1_000_000n)
    expect(formatTokens(overGoal)).not.toBe(formatTokens(TOKEN_GOAL_MICRO))
  })

  it('groups digits for the exact readout', () => {
    expect(groupDigits(999_999_999_999_999_999n)).toBe('999,999,999,999,999,999')
    expect(groupDigits(0n)).toBe('0')
    expect(groupDigits(1_234n)).toBe('1,234')
  })

  it('clamps progress into zero and one', () => {
    expect(progressTowardGoal(-1n)).toBe(0)
    expect(progressTowardGoal(0n)).toBe(0)
    expect(progressTowardGoal(TOKEN_GOAL_MICRO)).toBe(1)
    expect(progressTowardGoal(TOKEN_GOAL_MICRO * 2n)).toBe(1)
    const halfway = progressTowardGoal(TOKEN_GOAL_MICRO / 2n)
    expect(halfway).toBeGreaterThan(0.499)
    expect(halfway).toBeLessThan(0.501)
  })

  it('formats durations at every scale', () => {
    expect(formatDuration(0)).toBe('0s')
    expect(formatDuration(45_000)).toBe('45s')
    expect(formatDuration(64_000)).toBe('1m 04s')
    expect(formatDuration(3_600_000)).toBe('1h 00m')
    expect(formatDuration(90_000_000)).toBe('1d 1h')
  })

  it('keeps one token as exactly one million micro-tokens', () => {
    expect(MICRO_PER_TOKEN).toBe(1_000_000n)
    expect(TOKEN_GOAL_MICRO).toBe(TOKEN_GOAL * 1_000_000n)
  })
})
