import { describe, expect, it } from 'vitest'
import {
  OFFLINE_CAP_MS,
  MAX_SAVE_AGE_MS,
  SAVE_KEY,
  SAVE_VERSION,
  loadState,
  offlineElapsedMs,
  parseSave,
  saveState,
  serializeState,
  type StorageLike,
} from './persistence'
import { createInitialState, type EngineState } from './engine'
import { toMicro } from './numbers'

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0)

function memoryStorage(): StorageLike & { dump(): Map<string, string> } {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    dump: () => values,
  }
}

function sampleState(overrides: Partial<EngineState> = {}): EngineState {
  const base = createInitialState(NOW - 60_000)
  return {
    ...base,
    tokens: toMicro(12_345n),
    lifetimeTokens: toMicro(98_765n),
    producers: { ...base.producers, autocomplete: 7, chat: 2 },
    upgrades: ['batching', 'caching'],
    clickUpgrades: ['spoon'],
    clicks: 42,
    lastTickAt: NOW,
    ...overrides,
  }
}

describe('token-eater persistence', () => {
  it('serialises BigInt amounts as decimal strings', () => {
    // JSON.stringify throws on BigInt, which is the single most common way a
    // clicker save breaks. The serializer must produce plain JSON.
    const serialized = serializeState(sampleState(), NOW)
    expect(serialized.tokens).toBe('12345000000')
    expect(typeof serialized.tokens).toBe('string')
    expect(() => JSON.stringify(serialized)).not.toThrow()
  })

  it('round-trips a full save', () => {
    const storage = memoryStorage()
    const state = sampleState()
    expect(saveState(state, storage, NOW)).toBe(true)

    const loaded = loadState(storage, NOW)
    expect(loaded).not.toBeNull()
    expect(loaded?.state.tokens).toBe(state.tokens)
    expect(loaded?.state.lifetimeTokens).toBe(state.lifetimeTokens)
    expect(loaded?.state.producers).toEqual(state.producers)
    expect(loaded?.state.upgrades).toEqual(state.upgrades)
    expect(loaded?.state.clickUpgrades).toEqual(state.clickUpgrades)
    expect(loaded?.savedAt).toBe(NOW)
  })

  it('preserves values above Number.MAX_SAFE_INTEGER exactly', () => {
    const storage = memoryStorage()
    const huge = toMicro(999_999_999_999_999_999n - 1n)
    saveState(sampleState({ tokens: huge, lifetimeTokens: huge + 1n }), storage, NOW)
    const loaded = loadState(storage, NOW)
    expect(loaded?.state.tokens).toBe(huge)
    expect(loaded?.state.lifetimeTokens).toBe(huge + 1n)
    // Prove the round trip is exact and not accidentally a rounded double.
    expect(loaded?.state.tokens.toString()).toBe(huge.toString())
  })

  it('round-trips multiple automatic clickers and their partial interval', () => {
    const storage = memoryStorage()
    const state = sampleState({ autoClickers: 4, autoClickRemainderMs: 625 })
    saveState(state, storage, NOW)

    const loaded = loadState(storage, NOW)
    expect(loaded?.state.autoClickers).toBe(4)
    expect(loaded?.state.autoClickRemainderMs).toBe(625)
  })

  it('loads an existing v1 save without automatic-clicker fields', () => {
    const oldSave = serializeState(sampleState(), NOW) as unknown as Record<string, unknown>
    delete oldSave.autoClickers
    delete oldSave.autoClickRemainderMs

    const loaded = parseSave(JSON.stringify(oldSave), NOW)
    expect(loaded?.state.autoClickers).toBe(0)
    expect(loaded?.state.autoClickRemainderMs).toBe(0)
  })

  it('migrates an older boolean intern save to one hire', () => {
    const oldSave = serializeState(sampleState(), NOW) as unknown as Record<string, unknown>
    delete oldSave.autoClickers
    oldSave.autoClickerOwned = true
    oldSave.autoClickRemainderMs = 700

    const loaded = parseSave(JSON.stringify(oldSave), NOW)
    expect(loaded?.state.autoClickers).toBe(1)
    expect(loaded?.state.autoClickRemainderMs).toBe(700)
  })

  it('rejects malformed JSON without throwing', () => {
    const storage = memoryStorage()
    storage.setItem(SAVE_KEY, '{not json')
    expect(loadState(storage, NOW)).toBeNull()
  })

  it('rejects an unknown save version', () => {
    const raw = JSON.stringify({ ...serializeState(sampleState(), NOW), version: 99 })
    expect(parseSave(raw, NOW)).toBeNull()
  })

  it('rejects negative balances', () => {
    const raw = JSON.stringify({
      ...serializeState(sampleState(), NOW),
      tokens: '-1000',
      lifetimeTokens: '-1000',
    })
    expect(parseSave(raw, NOW)).toBeNull()
  })

  it('rejects non-integer amount strings', () => {
    const raw = JSON.stringify({
      ...serializeState(sampleState(), NOW),
      tokens: '1.5',
      lifetimeTokens: '2',
    })
    expect(parseSave(raw, NOW)).toBeNull()
  })

  it('rejects an exponent form that would silently change magnitude', () => {
    const raw = JSON.stringify({
      ...serializeState(sampleState(), NOW),
      tokens: '1e18',
      lifetimeTokens: '1e18',
    })
    expect(parseSave(raw, NOW)).toBeNull()
  })

  it('repairs a save where spendable tokens exceed lifetime earnings', () => {
    const raw = JSON.stringify({
      ...serializeState(sampleState(), NOW),
      tokens: '5000000000',
      lifetimeTokens: '1000000',
    })
    const parsed = parseSave(raw, NOW)
    expect(parsed).not.toBeNull()
    expect(parsed?.state.tokens).toBe(parsed?.state.lifetimeTokens)
  })

  it('drops unknown producer ids instead of failing the whole save', () => {
    const raw = JSON.stringify({
      ...serializeState(sampleState(), NOW),
      producers: { autocomplete: 3, 'not-a-real-producer': 999 },
    })
    const parsed = parseSave(raw, NOW)
    expect(parsed?.state.producers.autocomplete).toBe(3)
    expect('not-a-real-producer' in (parsed?.state.producers ?? {})).toBe(false)
  })

  it('caps absurd producer counts from a hand-edited save', () => {
    const raw = JSON.stringify({
      ...serializeState(sampleState(), NOW),
      tokens: '0',
      lifetimeTokens: '999999999999999999000000',
      producers: { autocomplete: 99_999_999 },
    })
    const parsed = parseSave(raw, NOW)
    expect(parsed?.state.producers.autocomplete).toBe(1_000_000)
  })

  it('rejects a save from another month', () => {
    const raw = JSON.stringify({
      ...serializeState(sampleState(), NOW - MAX_SAVE_AGE_MS - 1),
    })
    expect(parseSave(raw, NOW)).toBeNull()
  })

  it('reports the API version it wrote', () => {
    const serialized = serializeState(sampleState(), NOW)
    expect(serialized.version).toBe(SAVE_VERSION)
  })

  it('caps offline progress at eight hours', () => {
    const eightHours = 8 * 60 * 60 * 1_000
    expect(offlineElapsedMs(NOW - 60_000, NOW)).toBe(60_000)
    expect(offlineElapsedMs(NOW - eightHours * 3, NOW)).toBe(OFFLINE_CAP_MS)
    expect(offlineElapsedMs(NOW - eightHours, NOW)).toBe(OFFLINE_CAP_MS)
  })

  it('never pays negative offline time', () => {
    expect(offlineElapsedMs(NOW, NOW - 60_000)).toBe(0)
    expect(offlineElapsedMs(NOW, NOW)).toBe(0)
  })

  it('does not write when storage is unavailable', () => {
    expect(saveState(sampleState(), null, NOW)).toBe(false)
    expect(loadState(null, NOW)).toBeNull()
  })

  it('survives a storage that throws on write', () => {
    const throwing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {},
    }
    expect(() => saveState(sampleState(), throwing, NOW)).not.toThrow()
    expect(saveState(sampleState(), throwing, NOW)).toBe(false)
  })

  it('restores the won state so a finished run stays finished', () => {
    const storage = memoryStorage()
    const won = sampleState({
      lifetimeTokens: toMicro(999_999_999_999_999_999n),
      wonAt: NOW - 1_000,
    })
    saveState(won, storage, NOW)
    const loaded = loadState(storage, NOW)
    expect(loaded?.state.wonAt).toBe(NOW - 1_000)
  })
})
