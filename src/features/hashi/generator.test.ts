import { afterEach, describe, expect, it, vi } from 'vitest'
import { cloneFallback } from './fallbacks'
import { CATEGORY_CONFIG, generatePuzzle } from './generator'
import { evaluatePuzzle } from './rules'
import { countSolutions } from './solver'
import type { HashiCategory } from './types'

const categories: HashiCategory[] = ['intro', 'daily', 'weekly', 'monthly']

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Hashi puzzle generation', () => {
  it.each(categories)('generates a valid unique %s puzzle', (category) => {
    const generated = generatePuzzle(category, 123456)

    expect(evaluatePuzzle(generated.puzzle, generated.solution).solved).toBe(true)
    expect(countSolutions(generated.puzzle, 2)).toBe(1)
    expect(generated.puzzle.width).toBe(CATEGORY_CONFIG[category].width)
    expect(generated.puzzle.height).toBe(CATEGORY_CONFIG[category].height)
    expect(generated.puzzle.islands).toHaveLength(CATEGORY_CONFIG[category].targetIslands)
  })

  it('is deterministic for a supplied seed', () => {
    expect(generatePuzzle('intro', 42)).toEqual(generatePuzzle('intro', 42))
  })

  it.each(categories)('uses the configured bridge multiplicity for %s puzzles', (category) => {
    const generated = Array.from({ length: 8 }, (_, seed) =>
      generatePuzzle(category, 700_000 + seed),
    )
    const bridgeCounts = generated.flatMap(({ solution }) =>
      Object.values(solution).filter((count) => count > 0),
    )
    const clues = generated.flatMap(({ puzzle }) => puzzle.islands.map(({ clue }) => clue))
    const doubleShare = bridgeCounts.filter((count) => count === 2).length / bridgeCounts.length
    const oddClueShare = clues.filter((clue) => clue % 2 === 1).length / clues.length

    expect(generated.every(({ puzzle }) => !puzzle.id.startsWith('fallback-'))).toBe(true)
    expect(
      generated.every(
        ({ puzzle }) => puzzle.islands.length === CATEGORY_CONFIG[category].targetIslands,
      ),
    ).toBe(true)
    expect(Math.abs(doubleShare - CATEGORY_CONFIG[category].doubleRate)).toBeLessThan(0.08)
    expect(oddClueShare).toBeGreaterThan(0.1)
    expect(new Set(clues).size).toBeGreaterThanOrEqual(4)
  })

  it('returns the validated fallback when the overall generation budget is exhausted', () => {
    expect(
      generatePuzzle('monthly', 42, {
        timeBudgetMs: 0,
        now: () => 100,
      }),
    ).toEqual(cloneFallback('monthly'))
  })

  it('retries after a uniqueness search times out while overall time remains', () => {
    let clockReads = 0
    const generated = generatePuzzle('intro', 314159, {
      timeBudgetMs: 100,
      uniquenessTimeBudgetMs: 1,
      now: () => (clockReads++ < 4 ? 0 : 2),
    })

    expect(generated.puzzle.id).not.toBe('fallback-intro')
    expect(generated).not.toEqual(generatePuzzle('intro', 314159))
  })

  it.each(categories)('provides a valid unique %s fallback', (category) => {
    const fallback = cloneFallback(category)

    expect(evaluatePuzzle(fallback.puzzle, fallback.solution).solved).toBe(true)
    expect(countSolutions(fallback.puzzle, 2)).toBe(1)
    expect(fallback.puzzle.width).toBe(CATEGORY_CONFIG[category].width)
    expect(fallback.puzzle.height).toBe(CATEGORY_CONFIG[category].height)
  })

  it('returns a generated puzzle through the worker protocol', async () => {
    const workerScope: {
      onmessage: ((event: MessageEvent) => void) | null
      postMessage: ReturnType<typeof vi.fn>
    } = { onmessage: null, postMessage: vi.fn() }
    vi.stubGlobal('self', workerScope)
    vi.resetModules()

    await import('./generator.worker')
    workerScope.onmessage?.({
      data: { type: 'generate', category: 'intro', seed: 99 },
    } as MessageEvent)

    expect(workerScope.postMessage).toHaveBeenCalledWith({
      type: 'generated',
      puzzle: generatePuzzle('intro', 99).puzzle,
    })
  })
})
