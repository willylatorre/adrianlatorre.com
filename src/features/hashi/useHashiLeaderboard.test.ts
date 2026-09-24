import { describe, expect, it } from 'vitest'
import { qualifies } from './useHashiLeaderboard'

describe('qualifies', () => {
  it('qualifies when fewer than five scores exist or time beats fifth place', () => {
    expect(qualifies(90_000, 3, [{ durationMs: 120_000, hintsUsed: 0 }])).toBe(true)
    expect(
      qualifies(
        90_000,
        0,
        [1, 2, 3, 4, 80_000].map((durationMs) => ({ durationMs, hintsUsed: 0 })),
      ),
    ).toBe(false)
    expect(
      qualifies(
        70_000,
        3,
        [1, 2, 3, 4, 80_000].map((durationMs) => ({ durationMs, hintsUsed: 0 })),
      ),
    ).toBe(true)
  })

  it('uses fewer hints only when the cutoff time is equal', () => {
    const entries = [
      { durationMs: 1, hintsUsed: 0 },
      { durationMs: 2, hintsUsed: 0 },
      { durationMs: 3, hintsUsed: 0 },
      { durationMs: 4, hintsUsed: 0 },
      { durationMs: 80_000, hintsUsed: 2 },
    ]

    expect(qualifies(80_000, 1, entries)).toBe(true)
    expect(qualifies(80_000, 2, entries)).toBe(false)
    expect(qualifies(80_001, 0, entries)).toBe(false)
  })
})
