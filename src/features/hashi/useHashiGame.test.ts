import { effectScope } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { loadHashiState, saveHashiState, type HashiStorage } from './persistence'
import { createHashiGame, useHashiGame } from './useHashiGame'
import type { HashiPuzzle } from './types'

const fixedPuzzle: HashiPuzzle = {
  id: 'fixed',
  category: 'intro',
  width: 5,
  height: 3,
  islands: [
    { id: 'a', x: 0, y: 1, clue: 1 },
    { id: 'b', x: 4, y: 1, clue: 1 },
  ],
}

const crossingPuzzle: HashiPuzzle = {
  id: 'crossing',
  category: 'intro',
  width: 5,
  height: 5,
  islands: [
    { id: 'a', x: 0, y: 2, clue: 1 },
    { id: 'b', x: 4, y: 2, clue: 1 },
    { id: 'c', x: 2, y: 0, clue: 1 },
    { id: 'd', x: 2, y: 4, clue: 1 },
  ],
}

function createStorage(): HashiStorage {
  const values = new Map<string, string>()

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

describe('Hashi game state', () => {
  it('cycles bridge counts and records undo history', () => {
    const game = createHashiGame(fixedPuzzle, () => 1_000)

    game.cycleCorridor('a:b')
    game.cycleCorridor('a:b')
    game.cycleCorridor('a:b')

    expect(game.bridgeCounts['a:b']).toBe(0)
    game.undo()
    expect(game.bridgeCounts['a:b']).toBe(2)
    expect(game.history).toHaveLength(2)
  })

  it('refuses a bridge that crosses an active bridge', () => {
    const game = createHashiGame(crossingPuzzle, () => 1_000)

    game.cycleCorridor('a:b')

    expect(game.cycleCorridor('c:d')).toEqual({ changed: false, reason: 'crossing' })
    expect(game.bridgeCounts['c:d']).toBeUndefined()
    expect(game.history).toHaveLength(1)
  })

  it('allows overfilled islands while keeping the puzzle incomplete', () => {
    const game = createHashiGame(fixedPuzzle, () => 1_000)

    game.cycleCorridor('a:b')
    game.cycleCorridor('a:b')

    expect(game.bridgeCounts['a:b']).toBe(2)
    expect(game.evaluation.solved).toBe(false)
  })

  it('captures a solved wall-clock duration', () => {
    let clock = 1_000
    const game = createHashiGame(fixedPuzzle, () => clock)

    clock = 2_500
    expect(game.elapsedMs).toBe(1_500)
    game.cycleCorridor('a:b')

    clock = 9_000
    expect(game.evaluation.solved).toBe(true)
    expect(game.elapsedMs).toBe(1_500)
  })

  it('updates the framework-facing elapsed time from the wall clock', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
    const scope = effectScope()
    const game = scope.run(() =>
      useHashiGame({ initialPuzzle: fixedPuzzle, now: Date.now, storage: null }),
    )!

    expect(game.elapsedMs.value).toBe(0)
    vi.advanceTimersByTime(1_000)

    expect(game.elapsedMs.value).toBe(1_000)
    scope.stop()
    vi.useRealTimers()
  })

  it('persists history and restores the active run', () => {
    const storage = createStorage()
    const game = createHashiGame(fixedPuzzle, () => 1_000, { storage })

    game.cycleCorridor('a:b')

    expect(loadHashiState(storage)).toMatchObject({
      puzzle: fixedPuzzle,
      bridgeCounts: { 'a:b': 1 },
      history: [{ corridorId: 'a:b', previous: 0 }],
    })
  })

  it('persists a newly created run before the first move', () => {
    const storage = createStorage()
    createHashiGame(fixedPuzzle, () => 1_000, { storage })

    expect(loadHashiState(storage)).toMatchObject({
      preferredCategory: 'intro',
      puzzle: fixedPuzzle,
      bridgeCounts: {},
      startedAt: 1_000,
      history: [],
    })
  })

  it('selects a category and starts a fresh generated puzzle', () => {
    const dailyPuzzle = { ...fixedPuzzle, id: 'daily', category: 'daily' as const }
    const game = useHashiGame({
      initialPuzzle: fixedPuzzle,
      now: () => 1_000,
      generatePuzzle: (category) => (category === 'daily' ? dailyPuzzle : fixedPuzzle),
      storage: createStorage(),
    })

    game.selectCategory('daily')

    expect(game.preferredCategory.value).toBe('daily')
    expect(game.puzzle.value).toEqual(dailyPuzzle)
    expect(game.bridgeCounts.value).toEqual({})
  })

  it('restores the persisted preferred category, puzzle, and history', () => {
    const storage = createStorage()
    saveHashiState(
      {
        version: 1,
        preferredCategory: 'daily',
        puzzle: { ...fixedPuzzle, id: 'saved', category: 'daily' },
        bridgeCounts: { 'a:b': 1 },
        startedAt: 500,
        history: [{ corridorId: 'a:b', previous: 0 }],
        solvedAt: null,
      },
      storage,
    )

    const game = useHashiGame({ initialPuzzle: fixedPuzzle, now: () => 1_000, storage })

    expect(game.preferredCategory.value).toBe('daily')
    expect(game.puzzle.value.id).toBe('saved')
    expect(game.history.value).toEqual([{ corridorId: 'a:b', previous: 0 }])
  })
})
