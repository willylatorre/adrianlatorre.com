import { effectScope } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { HASHI_GENERATOR_VERSION } from './generator'
import { cloneFallback } from './fallbacks'
import { getVisibleCorridors } from './geometry'
import { loadHashiState, saveHashiState, type HashiStorage } from './persistence'
import { createHashiGame, useHashiGame } from './useHashiGame'
import type { HashiCategory, HashiPuzzle } from './types'

type WorkerRequest = {
  type: 'generate'
  category: HashiCategory
  seed: number
  requestId: number
}

class PuzzleWorkerDouble {
  onmessage:
    | ((event: MessageEvent<{ type: 'generated'; puzzle: HashiPuzzle; requestId: number }>) => void)
    | null = null
  onerror: ((event: Event) => void) | null = null
  requests: WorkerRequest[] = []
  terminated = false

  postMessage(message: WorkerRequest) {
    this.requests.push(message)
  }

  terminate() {
    this.terminated = true
  }

  deliver(requestId: number, puzzle: HashiPuzzle) {
    this.onmessage?.({ data: { type: 'generated', requestId, puzzle } } as MessageEvent)
  }
}

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
  it('cycles bridge counts', () => {
    const game = createHashiGame(fixedPuzzle, () => 1_000)

    game.cycleCorridor('a:b')
    game.cycleCorridor('a:b')
    game.cycleCorridor('a:b')

    expect(game.bridgeCounts['a:b']).toBe(0)
  })

  it('saves, replaces, and restores one bridge position', () => {
    const game = createHashiGame(fixedPuzzle, () => 1_000)

    game.cycleCorridor('a:b')
    game.saveSnapshot()
    expect(game.snapshot).toEqual({ 'a:b': 1 })

    game.cycleCorridor('a:b')
    expect(game.canRestoreSnapshot).toBe(true)
    expect(game.restoreSnapshot()).toBe(true)
    expect(game.bridgeCounts).toEqual({ 'a:b': 1 })
    expect(game.canRestoreSnapshot).toBe(false)

    game.cycleCorridor('a:b')
    game.saveSnapshot()
    expect(game.snapshot).toEqual({ 'a:b': 2 })
  })

  it('persists a saved position and clears it for reset and replacement puzzles', () => {
    const storage = createStorage()
    const game = createHashiGame(fixedPuzzle, () => 1_000, { storage })

    game.cycleCorridor('a:b')
    game.saveSnapshot()
    expect(loadHashiState(storage)?.snapshot).toEqual({ 'a:b': 1 })

    game.reset()
    expect(game.snapshot).toBeNull()
    game.cycleCorridor('a:b')
    game.saveSnapshot()
    game.newPuzzle()
    expect(game.snapshot).toBeNull()
  })

  it('refuses a bridge that crosses an active bridge', () => {
    const game = createHashiGame(crossingPuzzle, () => 1_000)

    game.cycleCorridor('a:b')

    expect(game.cycleCorridor('c:d')).toEqual({ changed: false, reason: 'crossing' })
    expect(game.bridgeCounts['c:d']).toBeUndefined()
  })

  it('exposes the bridges responsible for an invalid closed group', () => {
    const closedPair: HashiPuzzle = {
      id: 'closed-pair',
      category: 'intro',
      width: 3,
      height: 3,
      islands: [
        { id: 'a', x: 0, y: 0, clue: 1 },
        { id: 'b', x: 2, y: 0, clue: 1 },
        { id: 'c', x: 0, y: 2, clue: 1 },
        { id: 'd', x: 2, y: 2, clue: 1 },
      ],
    }
    const game = createHashiGame(closedPair, () => 1_000)
    game.cycleCorridor('a:b')

    expect(game.requestHint()).toMatchObject({ kind: 'invalid' })
    expect(game.feedbackCorridorIds).toEqual(['a:b'])
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

  it('persists and restores the active run', () => {
    const storage = createStorage()
    const game = createHashiGame(fixedPuzzle, () => 1_000, { storage })

    game.cycleCorridor('a:b')

    expect(loadHashiState(storage)).toMatchObject({
      puzzle: fixedPuzzle,
      bridgeCounts: { 'a:b': 1 },
    })
  })

  it('persists a newly created run before the first move', () => {
    const storage = createStorage()
    createHashiGame(fixedPuzzle, () => 1_000, { storage })

    expect(loadHashiState(storage)).toMatchObject({
      preferredCategory: 'intro',
      puzzle: fixedPuzzle,
      bridgeCounts: {},
      snapshot: null,
      hintsRemaining: 3,
      activeHint: null,
      startedAt: 1_000,
    })
  })

  it('spends one heart on a new hint and reopens the same hint for free', () => {
    const game = createHashiGame(fixedPuzzle, () => 1_000)

    expect(game.requestHint()).toMatchObject({
      kind: 'hint',
      hint: { corridorId: 'a:b', minimumCount: 1 },
    })
    expect(game.hintsRemaining).toBe(2)
    expect(game.activeHint?.corridorId).toBe('a:b')
    expect(game.hintFeedback).toContain('only one usable route')

    expect(game.requestHint()).toMatchObject({ kind: 'hint' })
    expect(game.hintsRemaining).toBe(2)
  })

  it('clears a displayed hint after a move and keeps spent hearts on reset', () => {
    const game = createHashiGame(fixedPuzzle, () => 1_000)

    game.requestHint()
    game.cycleCorridor('a:b')
    expect(game.activeHint).toBeNull()
    expect(game.hintFeedback).toBeNull()

    game.reset()
    expect(game.hintsRemaining).toBe(2)
    expect(game.activeHint).toBeNull()
  })

  it('keeps hearts outside saved positions and replenishes them for a new puzzle', () => {
    const nextPuzzle = { ...fixedPuzzle, id: 'next' }
    const game = createHashiGame(fixedPuzzle, () => 1_000, {
      generatePuzzle: () => nextPuzzle,
    })

    game.requestHint()
    game.saveSnapshot()
    game.cycleCorridor('a:b')
    game.restoreSnapshot()
    expect(game.hintsRemaining).toBe(2)
    expect(game.activeHint).toBeNull()

    game.newPuzzle()
    expect(game.puzzle.id).toBe('next')
    expect(game.hintsRemaining).toBe(3)
  })

  it('persists the remaining hearts and displayed hint across refresh', () => {
    const storage = createStorage()
    const first = createHashiGame(fixedPuzzle, () => 1_000, { storage })

    first.requestHint()
    const restored = createHashiGame(fixedPuzzle, () => 2_000, {
      storage,
      initialState: loadHashiState(storage)!,
    })

    expect(restored.hintsRemaining).toBe(2)
    expect(restored.activeHint?.corridorId).toBe('a:b')
    restored.requestHint()
    expect(restored.hintsRemaining).toBe(2)
  })

  it('does not charge a heart for an invalid or already-complete position', () => {
    const invalid = createHashiGame(fixedPuzzle, () => 1_000)
    invalid.cycleCorridor('a:b')
    invalid.cycleCorridor('a:b')

    expect(invalid.requestHint()).toMatchObject({ kind: 'invalid' })
    expect(invalid.hintsRemaining).toBe(3)

    const complete = createHashiGame(fixedPuzzle, () => 1_000)
    complete.cycleCorridor('a:b')
    expect(complete.requestHint()).toMatchObject({ kind: 'none' })
    expect(complete.hintsRemaining).toBe(3)
  })

  it('explains when all three hint hearts have been spent', () => {
    const game = createHashiGame(fixedPuzzle, () => 1_000)

    for (let hint = 0; hint < 3; hint += 1) {
      game.requestHint()
      game.reset()
    }

    expect(game.hintsRemaining).toBe(0)
    expect(game.requestHint()).toEqual({ kind: 'none', message: 'No hints left for this puzzle.' })
    expect(game.hintsRemaining).toBe(0)
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

  it('restores and can apply a persisted saved position without restarting the timer', () => {
    const storage = createStorage()
    saveHashiState(
      {
        version: 2,
        preferredCategory: 'daily',
        puzzle: { ...fixedPuzzle, id: 'saved', category: 'daily' },
        bridgeCounts: {},
        snapshot: { 'a:b': 1 },
        hintsRemaining: 1,
        activeHint: null,
        startedAt: 500,
        history: [{ corridorId: 'a:b', previous: 0 }],
        solvedAt: null,
      },
      storage,
    )

    const game = useHashiGame({ initialPuzzle: fixedPuzzle, now: () => 1_000, storage })

    expect(game.preferredCategory.value).toBe('daily')
    expect(game.puzzle.value.id).toBe('saved')
    expect(game.snapshot.value).toEqual({ 'a:b': 1 })
    expect(game.canRestoreSnapshot.value).toBe(true)
    expect(game.elapsedMs.value).toBe(500)
    expect(game.restoreSnapshot()).toBe(true)
    expect(game.evaluation.value.solved).toBe(true)
    expect(game.elapsedMs.value).toBe(500)
  })

  it('replaces a persisted puzzle from the previous generator while keeping its category', () => {
    const storage = createStorage()
    const freshMonthlyPuzzle = {
      ...fixedPuzzle,
      id: 'hashi-v4-monthly-fresh',
      category: 'monthly' as const,
    }
    saveHashiState(
      {
        version: 2,
        preferredCategory: 'monthly',
        puzzle: { ...fixedPuzzle, id: 'hashi-v3-monthly-old', category: 'monthly' },
        bridgeCounts: { 'a:b': 1 },
        hintsRemaining: 1,
        activeHint: null,
        startedAt: 500,
        history: [{ corridorId: 'a:b', previous: 0 }],
        solvedAt: null,
      },
      storage,
    )

    const game = useHashiGame({
      now: () => 1_000,
      storage,
      generatePuzzle: () => freshMonthlyPuzzle,
    })

    expect(game.preferredCategory.value).toBe('monthly')
    expect(game.puzzle.value).toEqual(freshMonthlyPuzzle)
    expect(game.bridgeCounts.value).toEqual({})
  })

  it('keeps the latest worker puzzle when category changes race', () => {
    const worker = new PuzzleWorkerDouble()
    const dailyPuzzle = { ...fixedPuzzle, id: 'daily-worker', category: 'daily' as const }
    const freshDailyPuzzle = {
      ...fixedPuzzle,
      id: 'daily-worker-fresh',
      category: 'daily' as const,
    }
    const game = useHashiGame({
      now: () => 1_000,
      storage: null,
      workerFactory: () => worker,
    })

    expect(game.generating.value).toBe(true)
    expect(game.puzzle.value.id).toMatch(new RegExp(`^hashi-${HASHI_GENERATOR_VERSION}-intro-`))
    expect(worker.requests).toMatchObject([{ category: 'intro', requestId: 1 }])

    game.selectCategory('daily')
    game.newPuzzle()
    const pendingDailyId = game.puzzle.value.id
    worker.deliver(2, dailyPuzzle)

    expect(game.preferredCategory.value).toBe('daily')
    expect(game.puzzle.value.id).toBe(pendingDailyId)
    expect(game.generating.value).toBe(true)
    expect(pendingDailyId).toMatch(new RegExp(`^hashi-${HASHI_GENERATOR_VERSION}-daily-`))

    worker.deliver(3, freshDailyPuzzle)

    expect(game.generating.value).toBe(false)
    expect(game.puzzle.value).toEqual(freshDailyPuzzle)
    expect(game.bridgeCounts.value).toEqual({})
  })

  it('uses the configured recovery puzzle when the worker is unavailable', () => {
    const generatedIntro = { ...fixedPuzzle, id: 'generated-intro' }
    const generatedMonthly = {
      ...fixedPuzzle,
      id: 'generated-monthly',
      category: 'monthly' as const,
    }
    const game = useHashiGame({
      now: () => 1_000,
      storage: null,
      workerFactory: () => null,
      fallbackGeneratePuzzle: (category) =>
        category === 'monthly' ? generatedMonthly : generatedIntro,
    })

    expect(game.generating.value).toBe(false)
    expect(game.puzzle.value.id).toBe('generated-intro')
    game.selectCategory('monthly')
    expect(game.puzzle.value.id).toBe('generated-monthly')
  })

  it.each(['unavailable', 'constructor error', 'worker error'])(
    'uses a seeded prevalidated fallback after %s',
    (failure) => {
      const worker = new PuzzleWorkerDouble()
      const game = useHashiGame({
        now: () => 1_000,
        storage: null,
        workerFactory: () => {
          if (failure === 'constructor error') throw new Error('Worker unavailable')
          return failure === 'unavailable' ? null : worker
        },
      })
      if (failure === 'worker error') worker.onerror?.(new Event('error'))

      expect(game.generating.value).toBe(false)
      expect(game.puzzle.value).toEqual(cloneFallback('intro', 1_001).puzzle)
      game.newPuzzle()
      expect(game.puzzle.value).toEqual(cloneFallback('intro', 1_002).puzzle)
      expect(game.generating.value).toBe(false)
    },
  )

  it('keeps fallback progress when its worker response arrives late', () => {
    const worker = new PuzzleWorkerDouble()
    const generatedPuzzle = { ...fixedPuzzle, id: 'generated-intro' }
    const game = useHashiGame({
      now: () => 1_000,
      storage: null,
      workerFactory: () => worker,
    })
    const pendingPuzzleId = game.puzzle.value.id

    const corridorId = getVisibleCorridors(game.puzzle.value.islands)[0]!.id
    game.cycleCorridor(corridorId)
    worker.deliver(1, generatedPuzzle)

    expect(game.puzzle.value.id).toBe(pendingPuzzleId)
    expect(game.bridgeCounts.value[corridorId]).toBe(1)
    expect(game.generating.value).toBe(false)
  })

  it('keeps a reset fallback when its pending worker response arrives', () => {
    const worker = new PuzzleWorkerDouble()
    const generatedPuzzle = { ...fixedPuzzle, id: 'generated-after-reset' }
    const game = useHashiGame({
      now: () => 1_000,
      storage: null,
      workerFactory: () => worker,
    })
    const pendingPuzzleId = game.puzzle.value.id

    game.reset()
    worker.deliver(1, generatedPuzzle)

    expect(game.puzzle.value.id).toBe(pendingPuzzleId)
    expect(game.bridgeCounts.value).toEqual({})
    expect(game.generating.value).toBe(false)
  })

  it.each(['response', 'error'])(
    'preserves a saved fallback when the pending worker sends %s',
    (event) => {
      const worker = new PuzzleWorkerDouble()
      const game = useHashiGame({ now: () => 1_000, storage: null, workerFactory: () => worker })
      const pendingPuzzle = game.puzzle.value
      const corridorId = getVisibleCorridors(pendingPuzzle.islands)[0]!.id
      game.cycleCorridor(corridorId)
      game.saveSnapshot()

      if (event === 'error') worker.onerror?.(new Event('error'))
      else worker.deliver(1, { ...fixedPuzzle, id: 'late-puzzle' })

      expect(game.puzzle.value).toEqual(pendingPuzzle)
      expect(game.bridgeCounts.value[corridorId]).toBe(1)
      expect(game.snapshot.value).toEqual({ [corridorId]: 1 })
      expect(game.generating.value).toBe(false)
    },
  )
})
