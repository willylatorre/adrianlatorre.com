import { describe, expect, it } from 'vitest'
import { qualifies } from './useHashiLeaderboard'

describe('qualifies', () => {
  it('qualifies when fewer than five scores exist or time beats fifth place', () => {
    expect(qualifies(90_000, [{ durationMs: 120_000 }])).toBe(true)
    expect(
      qualifies(
        90_000,
        [1, 2, 3, 4, 80_000].map((durationMs) => ({ durationMs })),
      ),
    ).toBe(false)
    expect(
      qualifies(
        70_000,
        [1, 2, 3, 4, 80_000].map((durationMs) => ({ durationMs })),
      ),
    ).toBe(true)
  })
})
