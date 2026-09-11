import { effectScope } from 'vue'
import { describe, expect, it, vi } from 'vitest'
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

  it('replaces a persisted puzzle from the previous generator while keeping its category', () => {
    const storage = createStorage()
    const freshMonthlyPuzzle = {
      ...fixedPuzzle,
      id: 'hashi-v4-monthly-fresh',
      category: 'monthly' as const,
    }
    saveHashiState(
      {
        version: 1,
        preferredCategory: 'monthly',
        puzzle: { ...fixedPuzzle, id: 'hashi-v3-monthly-old', category: 'monthly' },
        bridgeCounts: { 'a:b': 1 },
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
    expect(game.history.value).toEqual([])
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
    expect(game.puzzle.value.id).toBe('fallback-intro')
    expect(worker.requests).toMatchObject([{ category: 'intro', requestId: 1 }])

    game.selectCategory('daily')
    game.newPuzzle()
    worker.deliver(2, dailyPuzzle)

    expect(game.preferredCategory.value).toBe('daily')
    expect(game.puzzle.value.id).toBe('fallback-daily')

    worker.deliver(3, freshDailyPuzzle)

    expect(game.generating.value).toBe(false)
    expect(game.puzzle.value).toEqual(freshDailyPuzzle)
    expect(game.bridgeCounts.value).toEqual({})
  })

  it('synchronously creates a full puzzle when the worker is unavailable', () => {
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

  it('keeps fallback progress when its worker response arrives late', () => {
    const worker = new PuzzleWorkerDouble()
    const generatedPuzzle = { ...fixedPuzzle, id: 'generated-intro' }
    const game = useHashiGame({
      now: () => 1_000,
      storage: null,
      workerFactory: () => worker,
    })

    game.cycleCorridor('i0:i1')
    worker.deliver(1, generatedPuzzle)

    expect(game.puzzle.value.id).toBe('fallback-intro')
    expect(game.bridgeCounts.value['i0:i1']).toBe(1)
  })

  it('keeps a reset fallback when its pending worker response arrives', () => {
    const worker = new PuzzleWorkerDouble()
    const generatedPuzzle = { ...fixedPuzzle, id: 'generated-after-reset' }
    const game = useHashiGame({
      now: () => 1_000,
      storage: null,
      workerFactory: () => worker,
    })

    game.reset()
    worker.deliver(1, generatedPuzzle)

    expect(game.puzzle.value.id).toBe('fallback-intro')
    expect(game.bridgeCounts.value).toEqual({})
  })

  it('keeps an undone fallback when its pending worker response arrives', () => {
    const worker = new PuzzleWorkerDouble()
    const generatedPuzzle = { ...fixedPuzzle, id: 'generated-after-undo' }
    const game = useHashiGame({
      now: () => 1_000,
      storage: null,
      workerFactory: () => worker,
    })

    game.cycleCorridor('i0:i1')
    game.undo()
    worker.deliver(1, generatedPuzzle)

    expect(game.history.value).toEqual([])
    expect(game.puzzle.value.id).toBe('fallback-intro')
    expect(game.bridgeCounts.value['i0:i1']).toBe(0)
  })
})
