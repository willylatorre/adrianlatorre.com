/**
 * Big-number primitives for token-eater.
 *
 * The game counts tokens, and the win condition is 999,999,999,999,999,999
 * (10^18 - 1). That number is larger than Number.MAX_SAFE_INTEGER
 * (9,007,199,254,740,991) by more than a hundred times, so a JavaScript
 * `number` cannot represent every token between the start and the goal.
 * At 10^18 the gap between two representable doubles is 256, which means
 * `n + 1` silently does nothing.
 *
 * Every currency amount in the game therefore uses `bigint`.
 *
 * Fractions are the other problem. A rate of 0.5 tokens per second cannot be
 * added to an integer token balance once per frame without either losing the
 * fraction or switching to floating point. Instead the game stores
 * **micro-tokens**: one token is 1,000,000 micro-tokens. A rate of 0.5/s is
 * 500,000 micro-tokens per second, which is an integer. Rendering divides by
 * one million and never feeds a float back into the simulation.
 */

/** One displayed token, expressed in micro-tokens. */
export const MICRO_PER_TOKEN = 1_000_000n

/**
 * The win condition. Written as a BigInt literal because the decimal form is
 * not representable as an IEEE-754 double: `999999999999999999 === 1e18`
 * evaluates to `true` in JavaScript.
 */
export const TOKEN_GOAL = 999_999_999_999_999_999n

/** The goal in micro-tokens, which is what the engine compares against. */
export const TOKEN_GOAL_MICRO = TOKEN_GOAL * MICRO_PER_TOKEN

/** Cost growth per unit owned, as an exact fraction: 1.15 per purchase. */
export const COST_GROWTH_NUMERATOR = 115n
export const COST_GROWTH_DENOMINATOR = 100n

/** Converts a whole-token count to the engine's micro-token unit. */
export function toMicro(tokens: bigint): bigint {
  return tokens * MICRO_PER_TOKEN
}

/**
 * Converts a possibly fractional tokens-per-second rate into integer
 * micro-tokens per second. Rates are the only place a float is allowed,
 * because a designer needs to write "0.5 tokens per second" and mean it.
 */
export function rateToMicro(tokensPerSecond: number): bigint {
  return BigInt(Math.round(tokensPerSecond * Number(MICRO_PER_TOKEN)))
}

/** Rounds micro-tokens to a whole token count. */
export function toTokens(micro: bigint): bigint {
  return micro / MICRO_PER_TOKEN
}

/**
 * `base * (numerator / denominator) ** exponent`, floored, using exact
 * integer arithmetic. Used for the geometric price of the next unit.
 */
export function scaleByPower(
  base: bigint,
  numerator: bigint,
  denominator: bigint,
  exponent: number,
): bigint {
  if (exponent <= 0) return base
  let powerNumerator = 1n
  let powerDenominator = 1n
  for (let index = 0; index < exponent; index += 1) {
    powerNumerator *= numerator
    powerDenominator *= denominator
  }
  return (base * powerNumerator) / powerDenominator
}

/** Price of the next unit, given how many are already owned. */
export function costAt(baseCostMicro: bigint, owned: number): bigint {
  return scaleByPower(baseCostMicro, COST_GROWTH_NUMERATOR, COST_GROWTH_DENOMINATOR, owned)
}

/**
 * Applied every tick. Integer division means a very small rate can round down
 * to zero for a single frame; the remainder is recovered because the engine
 * passes elapsed milliseconds rather than a frame count, and sub-token rates
 * are still millions of micro-tokens per second.
 */
export function earningsFor(rateMicroPerSecond: bigint, elapsedMs: number): bigint {
  if (rateMicroPerSecond <= 0n || elapsedMs <= 0) return 0n
  return (rateMicroPerSecond * BigInt(Math.round(elapsedMs))) / 1000n
}

const SHORT_SCALE = [
  '',
  'K',
  'M',
  'B',
  'T',
  'Qa',
  'Qi',
  'Sx',
  'Sp',
  'Oc',
  'No',
  'Dc',
  'Ud',
  'Dd',
  'Td',
  'Qad',
  'Qid',
  'Sxd',
  'Spd',
  'Ocd',
  'Nod',
  'Vg',
] as const

/**
 * Compact token label, e.g. `1.23M` or `4.56Qa`.
 *
 * `Intl.NumberFormat` with `notation: 'compact'` supports BigInt and is used
 * for the K/M/B/T range. Past `T` it falls back to this table because the
 * built-in formatter produces `1,000,000T`, which stops being readable long
 * before the game ends.
 *
 * `fractional` keeps up to two decimals for values below one token. Rates and
 * click yields need that: `0.5 tokens/s` must not render as `0/s`.
 */
export function formatTokens(
  micro: bigint,
  options: { precise?: boolean; fractional?: boolean } = {},
): string {
  const whole = toTokens(micro)
  const negative = whole < 0n
  const value = negative ? -whole : whole

  // Below one token there is nothing for the compact table to work with, so
  // print the meaningful fraction instead of rounding the game to zero.
  if (options.fractional && value === 0n && micro !== 0n) {
    const remainder = (micro < 0n ? -micro : micro) % MICRO_PER_TOKEN
    const hundredths = remainder / 10_000n
    if (hundredths === 0n) return `${negative ? '-' : ''}<0.01`
    const text = (Number(hundredths) / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
    return `${negative ? '-' : ''}${text}`
  }

  if (options.precise) {
    return `${negative ? '-' : ''}${groupDigits(value)}`
  }

  if (value < 1_000n) {
    return `${negative ? '-' : ''}${value.toString()}`
  }

  const digits = value.toString()
  const group = Math.min(Math.floor((digits.length - 1) / 3), SHORT_SCALE.length - 1)
  const suffix = SHORT_SCALE[group]
  const wholePartLength = digits.length - group * 3
  const wholePart = digits.slice(0, wholePartLength)
  const fraction = digits.slice(wholePartLength, wholePartLength + 2).padEnd(2, '0')
  const trimmedFraction = fraction.replace(/0+$/, '')

  const label = trimmedFraction.length > 0 ? `${wholePart}.${trimmedFraction}` : wholePart
  return `${negative ? '-' : ''}${label}${suffix}`
}

/** Full grouped integer, for the "exact number" readout. */
export function groupDigits(value: bigint): string {
  const negative = value < 0n
  const digits = (negative ? -value : value).toString()
  const parts: string[] = []
  for (let end = digits.length; end > 0; end -= 3) {
    parts.unshift(digits.slice(Math.max(0, end - 3), end))
  }
  return `${negative ? '-' : ''}${parts.join(',')}`
}

/**
 * How far the lifetime total has travelled toward the goal, as 0..1.
 * Uses integers so the progress bar never fights a float for its last pixel.
 */
export function progressTowardGoal(lifetimeMicro: bigint): number {
  if (lifetimeMicro <= 0n) return 0
  if (lifetimeMicro >= TOKEN_GOAL_MICRO) return 1
  const scaled = (lifetimeMicro * 1_000_000n) / TOKEN_GOAL_MICRO
  return Number(scaled) / 1_000_000
}

/** Formats a rate such as `2.4M/s` or `0.5/s` for the early game. */
export function formatRate(rateMicroPerSecond: bigint): string {
  return `${formatTokens(rateMicroPerSecond, { fractional: true })}/s`
}

/**
 * Human duration such as `12m 04s`. Used for cooldown and run-time labels.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1_000))
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) return `${hours}h ${remainingMinutes.toString().padStart(2, '0')}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}
