import { createInitialState, type EngineState } from './engine'
import {
  AUTO_CLICKER,
  POWERUPS,
  PRODUCERS,
  type ClickUpgradeId,
  type PowerupId,
  type ProducerId,
  type UpgradeId,
} from './content'
import { TOKEN_GOAL_MICRO } from './numbers'

/**
 * Saving a clicker is the part nobody warns you about.
 *
 * Three problems show up immediately:
 *
 * 1. `JSON.stringify` throws on BigInt, and every currency value is a BigInt.
 *    The save therefore stores micro-token amounts as decimal strings.
 * 2. Tabs disagree. Two open tabs each advance the clock and write their own
 *    version of the truth. A `BroadcastChannel` lets the newest committed save
 *    win without a backend.
 * 3. Time passes while the page is closed. Offline progress is a feature, but
 *    an unbounded version means a player can return after a year and skip the
 *    game. The reward is therefore capped.
 */

export const SAVE_KEY = 'adrianlatorre.token-eater.v1'
export const SAVE_VERSION = 1
export const CHANNEL_NAME = 'adrianlatorre.token-eater.v1'

/** Offline progress is capped at eight hours of production. */
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1_000

/** Saves older than this are treated as a different run, not a resume. */
export const MAX_SAVE_AGE_MS = 30 * 24 * 60 * 60 * 1_000

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * The serialized shape. Kept flat and string-heavy on purpose: it is easy to
 * inspect in DevTools and does not depend on any revival library.
 */
export interface SerializedSave {
  version: number
  savedAt: number
  tokens: string
  lifetimeTokens: string
  producers: Partial<Record<ProducerId, number>>
  upgrades: UpgradeId[]
  clickUpgrades: string[]
  clicks: number
  autoClickers?: number
  /** Read for compatibility with saves from the first one-intern release. */
  autoClickerOwned?: boolean
  autoClickRemainderMs?: number
  powerupReadyAt: Partial<Record<PowerupId, number>>
  boostEndsAt: number | null
  boostMultiplier: number
  startedAt: number
  wonAt: number | null
}

const PRODUCER_IDS = new Set<string>(PRODUCERS.map((item) => item.id))
const POWERUP_IDS = new Set<string>(POWERUPS.map((item) => item.id))

export function serializeState(state: EngineState, now: number): SerializedSave {
  return {
    version: SAVE_VERSION,
    savedAt: now,
    tokens: state.tokens.toString(),
    lifetimeTokens: state.lifetimeTokens.toString(),
    producers: { ...state.producers },
    upgrades: [...state.upgrades],
    clickUpgrades: [...state.clickUpgrades],
    clicks: state.clicks,
    autoClickers: state.autoClickers,
    autoClickRemainderMs: state.autoClickRemainderMs,
    powerupReadyAt: { ...state.powerupReadyAt },
    boostEndsAt: state.boostEndsAt,
    boostMultiplier: state.boostMultiplier,
    startedAt: state.startedAt,
    wonAt: state.wonAt,
  }
}

export function saveState(
  state: EngineState,
  storage: StorageLike | null | undefined,
  now: number,
): boolean {
  const target = resolveStorage(storage)
  if (!target) return false
  try {
    target.setItem(SAVE_KEY, JSON.stringify(serializeState(state, now)))
    return true
  } catch {
    // Quota errors and private-mode failures must never break the game.
    return false
  }
}

/** A gap shorter than this is not worth a dialog. */
export const OFFLINE_REPORT_MIN_MS = 60_000

export interface LoadedSave {
  state: EngineState
  /** When the save was written, used to compute offline progress. */
  savedAt: number
}

export function loadState(storage: StorageLike | null | undefined, now: number): LoadedSave | null {
  const target = resolveStorage(storage)
  if (!target) return null
  try {
    return parseSave(target.getItem(SAVE_KEY), now)
  } catch {
    return null
  }
}

export function parseSave(raw: string | null, now: number): LoadedSave | null {
  if (!raw) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(value) || value.version !== SAVE_VERSION) return null

  const savedAt = typeof value.savedAt === 'number' ? value.savedAt : null
  if (savedAt === null || !Number.isFinite(savedAt)) return null
  if (now - savedAt > MAX_SAVE_AGE_MS) return null

  const tokens = parseAmount(value.tokens)
  const lifetimeTokens = parseAmount(value.lifetimeTokens)
  if (tokens === null || lifetimeTokens === null) return null

  // A corrupted save must never hand the player a negative or absurd balance.
  if (tokens < 0n || lifetimeTokens < 0n) return null
  if (tokens > lifetimeTokens) {
    // Money cannot exceed everything ever earned. Repair rather than discard.
    return buildState(value, savedAt, lifetimeTokens, lifetimeTokens)
  }

  return buildState(value, savedAt, tokens, lifetimeTokens)
}

function buildState(
  value: Record<string, unknown>,
  savedAt: number,
  tokens: bigint,
  lifetimeTokens: bigint,
): LoadedSave | null {
  const producers = createInitialState(savedAt).producers
  if (!isRecord(value.producers)) return null
  for (const [id, count] of Object.entries(value.producers)) {
    if (!PRODUCER_IDS.has(id)) continue
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) return null
    // Guard against a hand-edited save producing ludicrous instant income.
    producers[id as ProducerId] = Math.min(count, 1_000_000)
  }

  const upgrades = Array.isArray(value.upgrades)
    ? value.upgrades.filter((id): id is UpgradeId => typeof id === 'string')
    : []
  const clickUpgrades = Array.isArray(value.clickUpgrades)
    ? value.clickUpgrades.filter((id): id is ClickUpgradeId => typeof id === 'string')
    : []

  const powerupReadyAt: Partial<Record<PowerupId, number>> = {}
  if (isRecord(value.powerupReadyAt)) {
    for (const [id, readyAt] of Object.entries(value.powerupReadyAt)) {
      if (!POWERUP_IDS.has(id)) continue
      if (typeof readyAt !== 'number' || !Number.isFinite(readyAt)) continue
      powerupReadyAt[id as PowerupId] = readyAt
    }
  }

  const wonAt = typeof value.wonAt === 'number' && Number.isFinite(value.wonAt) ? value.wonAt : null
  const startedAt =
    typeof value.startedAt === 'number' && Number.isFinite(value.startedAt)
      ? value.startedAt
      : savedAt
  const boostEndsAt =
    typeof value.boostEndsAt === 'number' && Number.isFinite(value.boostEndsAt)
      ? value.boostEndsAt
      : null
  const autoClickers =
    typeof value.autoClickers === 'number' && Number.isInteger(value.autoClickers)
      ? Math.max(0, Math.min(1_000_000, value.autoClickers))
      : value.autoClickerOwned === true
        ? 1
        : 0
  const autoClickRemainderMs =
    autoClickers > 0 && typeof value.autoClickRemainderMs === 'number'
      ? Math.max(0, Math.min(AUTO_CLICKER.intervalMs - 1, Math.floor(value.autoClickRemainderMs)))
      : 0

  return {
    savedAt,
    state: {
      tokens,
      lifetimeTokens,
      producers,
      upgrades,
      clickUpgrades,
      clicks: typeof value.clicks === 'number' ? Math.max(0, Math.floor(value.clicks)) : 0,
      // Older v1 saves had either no intern field or a boolean for one intern.
      // They remain playable; a saved intern migrates to a count of one.
      autoClickers,
      autoClickRemainderMs,
      powerupReadyAt,
      boostEndsAt,
      boostMultiplier:
        typeof value.boostMultiplier === 'number' && value.boostMultiplier > 0
          ? value.boostMultiplier
          : 1,
      lastTickAt: savedAt,
      startedAt,
      wonAt: wonAt ?? (lifetimeTokens >= TOKEN_GOAL_MICRO ? savedAt : null),
    },
  }
}

function parseAmount(value: unknown): bigint | null {
  if (typeof value === 'string') {
    // Only plain non-negative integers are accepted. No exponents, no signs,
    // no decimal points, because every value here is an integer count.
    if (!/^\d+$/.test(value)) return null
    try {
      return BigInt(value)
    } catch {
      return null
    }
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) return null
    return BigInt(value)
  }
  return null
}

/**
 * Offline earnings are paid at the rate the player left with, for the elapsed
 * wall-clock time, capped. The same `tick` function is used, so offline time
 * cannot invent a different economy.
 */
export function offlineElapsedMs(savedAt: number, now: number): number {
  if (now <= savedAt) return 0
  return Math.min(now - savedAt, OFFLINE_CAP_MS)
}

export interface SaveChannel {
  postMessage(message: { type: 'save'; savedAt: number; state: EngineState }): void
  close(): void
  addEventListener?(type: 'message', listener: (event: MessageEvent) => void): void
  onmessage?: ((event: MessageEvent) => void) | null
}

export type ChannelFactory = (name: string) => SaveChannel | null

export function createChannel(factory?: ChannelFactory): SaveChannel | null {
  if (factory) return factory(CHANNEL_NAME)
  if (typeof window === 'undefined' || typeof window.BroadcastChannel !== 'function') {
    return null
  }
  try {
    return new window.BroadcastChannel(CHANNEL_NAME) as unknown as SaveChannel
  } catch {
    return null
  }
}

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  try {
    if (storage !== undefined) return storage
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
