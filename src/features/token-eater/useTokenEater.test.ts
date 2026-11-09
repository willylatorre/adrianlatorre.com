// @vitest-environment jsdom

import { effectScope } from 'vue'
import { describe, expect, it } from 'vitest'
import { createInitialState } from './engine'
import { saveState, type StorageLike } from './persistence'
import { toMicro } from './numbers'
import { useTokenEater } from './useTokenEater'

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0)

function memoryStorage(): StorageLike {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

describe('useTokenEater run clock', () => {
  it('restores saved resources, run time, and cooldowns without catch-up accrual', () => {
    const storage = memoryStorage()
    const savedAt = NOW - 2 * 60 * 60 * 1_000
    const initial = createInitialState(savedAt)
    const saved = {
      ...initial,
      tokens: toMicro(12_345n),
      lifetimeTokens: toMicro(98_765n),
      producers: { ...initial.producers, chat: 2 },
      playTimeMs: 4 * 60 * 1_000,
      powerupCooldownMs: { 'cache-hit': 45_000 },
      boostRemainingMs: 12_000,
      boostMultiplier: 3,
    }
    expect(saveState(saved, storage, savedAt)).toBe(true)

    const game = useTokenEater({
      storage,
      now: () => NOW,
      autoStart: false,
      channelFactory: () => null,
    })

    expect(game.state.value.tokens).toBe(saved.tokens)
    expect(game.state.value.lifetimeTokens).toBe(saved.lifetimeTokens)
    expect(game.state.value.playTimeMs).toBe(saved.playTimeMs)
    expect(game.state.value.powerupCooldownMs['cache-hit']).toBe(45_000)
    expect(game.state.value.boostRemainingMs).toBe(12_000)
  })

  it('advances resources and run time on a visible simulation tick', () => {
    let now = NOW
    const scheduled: { frame?: (frameAt: number) => void } = {}
    const storage = memoryStorage()
    const initial = createInitialState(NOW)
    saveState(
      {
        ...initial,
        producers: { ...initial.producers, chat: 1 },
      },
      storage,
      NOW,
    )

    const game = useTokenEater({
      storage,
      now: () => now,
      schedule(callback) {
        scheduled.frame = callback
        return () => {
          scheduled.frame = undefined
        }
      },
      channelFactory: () => null,
    })

    now += 1_000
    scheduled.frame?.(now)

    expect(game.state.value.playTimeMs).toBe(1_000)
    expect(game.state.value.lifetimeTokens).toBe(toMicro(11n))
  })

  it('does not catch up ticks while the document is hidden', () => {
    let now = NOW
    const scheduled: { frame?: (frameAt: number) => void } = {}
    const storage = memoryStorage()
    const initial = createInitialState(NOW)
    saveState({ ...initial, producers: { ...initial.producers, chat: 1 } }, storage, NOW)

    const scope = effectScope()
    const game = scope.run(() =>
      useTokenEater({
        storage,
        now: () => now,
        schedule(callback) {
          scheduled.frame = callback
          return () => {
            scheduled.frame = undefined
          }
        },
        channelFactory: () => null,
      }),
    )!

    const visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    try {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      })
      document.dispatchEvent(new Event('visibilitychange'))
      now += 60_000
      scheduled.frame?.(now)
      expect(game.state.value.playTimeMs).toBe(0)
      expect(game.state.value.lifetimeTokens).toBe(0n)

      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      })
      document.dispatchEvent(new Event('visibilitychange'))
      now += 1_000
      scheduled.frame?.(now)

      expect(game.state.value.playTimeMs).toBe(1_000)
      expect(game.state.value.lifetimeTokens).toBe(toMicro(11n))
    } finally {
      scope.stop()
      if (visibilityDescriptor) {
        Object.defineProperty(document, 'visibilityState', visibilityDescriptor)
      } else {
        Reflect.deleteProperty(document, 'visibilityState')
      }
    }
  })
})
