import { afterEach, describe, expect, it, vi } from 'vitest'
import { cloneFallback } from './fallbacks'
import { CATEGORY_CONFIG, generatePuzzle } from './generator'
import { corridorsCross, getVisibleCorridors } from './geometry'
import { evaluatePuzzle } from './rules'
import { countSolutions } from './solver'
import type { HashiCategory, HashiPuzzle } from './types'

const categories: HashiCategory[] = ['intro', 'daily', 'weekly', 'monthly']
const expectedIslandCounts: Record<HashiCategory, number> = {
  intro: 32,
  daily: 72,
  weekly: 108,
  monthly: 150,
}

function expectIslandsTouchEveryBoundary(puzzle: HashiPuzzle) {
  const xs = puzzle.islands.map(({ x }) => x)
  const ys = puzzle.islands.map(({ y }) => y)

  expect(Math.min(...xs)).toBe(0)
  expect(Math.max(...xs)).toBe(puzzle.width - 1)
  expect(Math.min(...ys)).toBe(0)
  expect(Math.max(...ys)).toBe(puzzle.height - 1)
}

function expectNoNeighboringIslands(puzzle: HashiPuzzle) {
  for (const [index, island] of puzzle.islands.entries()) {
    for (const other of puzzle.islands.slice(index + 1)) {
      expect(Math.abs(island.x - other.x) > 1 || Math.abs(island.y - other.y) > 1).toBe(true)
    }
  }
}

function expectNoLargeEmptyBands(puzzle: HashiPuzzle) {
  for (const [coordinates, size] of [
    [puzzle.islands.map(({ x }) => x), puzzle.width],
    [puzzle.islands.map(({ y }) => y), puzzle.height],
  ] as const) {
    const occupied = [...new Set(coordinates)].sort((left, right) => left - right)

    expect(occupied[0]).toBe(0)
    expect(occupied.at(-1)).toBe(size - 1)
    expect(
      occupied.slice(1).every((coordinate, index) => coordinate - occupied[index]! <= 3),
    ).toBe(true)
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Hashi puzzle generation', () => {
  it.each(categories)('generates a valid unique %s puzzle', (category) => {
    const generated = generatePuzzle(category, 123456)

    expect(CATEGORY_CONFIG[category].targetIslands).toBe(expectedIslandCounts[category])
    expect(evaluatePuzzle(generated.puzzle, generated.solution).solved).toBe(true)
    expect(countSolutions(generated.puzzle, 2)).toBe(1)
    expect(generated.puzzle.width).toBe(CATEGORY_CONFIG[category].width)
    expect(generated.puzzle.height).toBe(CATEGORY_CONFIG[category].height)
    expect(generated.puzzle.islands).toHaveLength(CATEGORY_CONFIG[category].targetIslands)
    expectIslandsTouchEveryBoundary(generated.puzzle)
    expectNoNeighboringIslands(generated.puzzle)
    expectNoLargeEmptyBands(generated.puzzle)
  })

  it.each(categories)('keeps representative %s layouts separated and distributed', (category) => {
    for (let seed = 0; seed < 5; seed += 1) {
      const { puzzle } = generatePuzzle(category, 910_000 + seed)

      expect(puzzle.id).not.toBe(`fallback-${category}`)
      expect(puzzle.islands).toHaveLength(expectedIslandCounts[category])
      expectIslandsTouchEveryBoundary(puzzle)
      expectNoNeighboringIslands(puzzle)
      expectNoLargeEmptyBands(puzzle)
    }
  })

  it('is deterministic for a supplied seed', () => {
    expect(generatePuzzle('intro', 42)).toEqual(generatePuzzle('intro', 42))
  })

  it.each(categories)('keeps a readable bridge and clue mix in %s puzzles', (category) => {
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
    expect(doubleShare).toBeGreaterThan(0.75)
    expect(doubleShare).toBeLessThan(0.99)
    expect(bridgeCounts.some((count) => count === 1)).toBe(true)
    expect(bridgeCounts.some((count) => count === 2)).toBe(true)
    expect(oddClueShare).toBeGreaterThan(0.1)
    expect(new Set(clues).size).toBeGreaterThanOrEqual(4)
  })

  it.each([
    ['weekly', 123457],
    ['monthly', 123456],
  ] as const)(
    'generates a representative non-crossing %s puzzle with a cycle',
    (category, seed) => {
      const { puzzle, solution } = generatePuzzle(category, seed)
      const islandById = new Map(puzzle.islands.map((island) => [island.id, island]))
      const selected = getVisibleCorridors(puzzle.islands).filter(({ id }) => solution[id] > 0)

      expect(puzzle.id).not.toBe(`fallback-${category}`)
      expect(selected.length).toBeGreaterThan(puzzle.islands.length - 1)
      expect(
        selected.every((first, firstIndex) =>
          selected
            .slice(firstIndex + 1)
            .every(
              (second) =>
                !corridorsCross(
                  { a: islandById.get(first.a)!, b: islandById.get(first.b)! },
                  { a: islandById.get(second.a)!, b: islandById.get(second.b)! },
                ),
            ),
        ),
      ).toBe(true)
    },
  )

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
    expectIslandsTouchEveryBoundary(fallback.puzzle)
    expectNoNeighboringIslands(fallback.puzzle)
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
