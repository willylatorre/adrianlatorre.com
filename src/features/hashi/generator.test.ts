import { afterEach, describe, expect, it, vi } from 'vitest'
import { assessDifficulty } from './difficulty'
import { cloneFallback } from './fallbacks'
import {
  CATEGORY_CONFIG,
  countOpeningDeductions,
  generatePuzzle,
  generateFallbackPuzzle,
  hasBroadCoordinateUse,
  hasLocalIslandCoverage,
  hasMinimumIslandSpacing,
} from './generator'
import { corridorsCross, countCorridorCrossings, getVisibleCorridors } from './geometry'
import { evaluatePuzzle } from './rules'
import { countSolutionsWithDeadline } from './solver'
import type { HashiCategory, HashiPuzzle, Island } from './types'

const categories: HashiCategory[] = ['intro', 'daily', 'weekly', 'monthly']
const expectedIslandCounts: Record<HashiCategory, number> = {
  intro: 30,
  daily: 120,
  weekly: 190,
  monthly: 280,
}

const expectedDimensions: Record<HashiCategory, [number, number]> = {
  intro: [10, 10],
  daily: [20, 20],
  weekly: [25, 25],
  monthly: [30, 30],
}

const challengingCategories = ['daily', 'weekly', 'monthly'] as const
const minimumCrossingPairs = { daily: 4, weekly: 8, monthly: 12 } as const

function expectBalancedChallenge(
  category: (typeof challengingCategories)[number],
  generated: ReturnType<typeof generatePuzzle>,
) {
  const { puzzle, solution } = generated
  const clues = puzzle.islands.map((island) => island.clue)
  const activeCounts = Object.values(solution).filter((count) => count > 0)
  expect(new Set(clues).size).toBeGreaterThanOrEqual(6)
  expect(clues.every((clue) => clue >= 1 && clue <= 8)).toBe(true)
  expect(activeCounts).toContain(1)
  expect(activeCounts).toContain(2)
  expect(activeCounts.length).toBeGreaterThanOrEqual(puzzle.islands.length)
  expect(countCorridorCrossings(puzzle.islands)).toBeGreaterThanOrEqual(
    minimumCrossingPairs[category],
  )
  expect(assessDifficulty(puzzle)).toMatchObject({
    solved: true,
    difficulty: CATEGORY_CONFIG[category].difficulty,
  })
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
      expect(Math.abs(island.x - other.x) + Math.abs(island.y - other.y) > 1).toBe(true)
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
    expect(occupied.slice(1).every((coordinate, index) => coordinate - occupied[index]! <= 3)).toBe(
      true,
    )
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Hashi puzzle generation', () => {
  it('allows diagonal staggering while keeping space for bridges', () => {
    const at = (x: number, y: number): Island => ({ id: `${x},${y}`, x, y, clue: 1 })
    expect(hasMinimumIslandSpacing([at(0, 0), at(1, 1)])).toBe(true)
    expect(hasMinimumIslandSpacing([at(0, 0), at(1, 0)])).toBe(false)
    expect(hasMinimumIslandSpacing([at(0, 0), at(0, 1)])).toBe(false)
    expect(hasMinimumIslandSpacing([at(0, 0), at(0, 0)])).toBe(false)
  })

  it.each(categories)('uses staggered, dense %s layouts', (category) => {
    const { puzzle } = generatePuzzle(category, 123456)
    const diagonalPairs = puzzle.islands.flatMap((a, index) =>
      puzzle.islands
        .slice(index + 1)
        .filter((b) => Math.abs(a.x - b.x) === 1 && Math.abs(a.y - b.y) === 1),
    )
    expect(diagonalPairs.length / puzzle.islands.length).toBeGreaterThan(0.25)
    expect(puzzle.islands.length / (puzzle.width * puzzle.height)).toBeGreaterThanOrEqual(0.29)
  })

  it('detects a two-dimensional hole that occupied coordinate projections miss', () => {
    const perimeter = [
      ...Array.from({ length: 11 }, (_, x) => ({ x, y: 0 })),
      ...Array.from({ length: 11 }, (_, x) => ({ x, y: 10 })),
      ...Array.from({ length: 9 }, (_, index) => ({ x: 0, y: index + 1 })),
      ...Array.from({ length: 9 }, (_, index) => ({ x: 10, y: index + 1 })),
    ].map<Island>(({ x, y }, index) => ({ id: `i${index}`, x, y, clue: 1 }))

    expect(hasBroadCoordinateUse(perimeter, 11, 11)).toBe(true)
    expect(hasLocalIslandCoverage(perimeter, 11, 11, 4)).toBe(false)
  })

  it('counts only islands that force at least one opening bridge', () => {
    const constrainedLeaves: HashiPuzzle = {
      id: 'opening-capacity',
      category: 'daily',
      width: 5,
      height: 5,
      islands: [
        { id: 'center', x: 2, y: 2, clue: 2 },
        { id: 'top', x: 2, y: 0, clue: 1 },
        { id: 'right', x: 4, y: 2, clue: 1 },
        { id: 'bottom', x: 2, y: 4, clue: 1 },
      ],
    }

    expect(countOpeningDeductions(constrainedLeaves)).toBe(3)
  })

  it.each(categories)('generates a valid %s puzzle', (category) => {
    const generated = generatePuzzle(category, 123456, { now: () => 0 })
    expect(generated.source).toBe('generated')

    expect(CATEGORY_CONFIG[category].targetIslands).toBe(expectedIslandCounts[category])
    expect([CATEGORY_CONFIG[category].width, CATEGORY_CONFIG[category].height]).toEqual(
      expectedDimensions[category],
    )
    expect(evaluatePuzzle(generated.puzzle, generated.solution).solved).toBe(true)
    expect(generated.puzzle.width).toBe(CATEGORY_CONFIG[category].width)
    expect(generated.puzzle.height).toBe(CATEGORY_CONFIG[category].height)
    expect(generated.puzzle.islands).toHaveLength(CATEGORY_CONFIG[category].targetIslands)
    expectIslandsTouchEveryBoundary(generated.puzzle)
    expectNoNeighboringIslands(generated.puzzle)
    expectNoLargeEmptyBands(generated.puzzle)
  })

  it.each(
    categories.flatMap((category) =>
      Array.from({ length: 5 }, (_, seed) => [category, seed] as const),
    ),
  )(
    'keeps %s seed %s separated and distributed',
    (category, seed) => {
      const { puzzle } = generatePuzzle(category, 910_000 + seed)

      expect(puzzle.islands).toHaveLength(expectedIslandCounts[category])
      expectIslandsTouchEveryBoundary(puzzle)
      expectNoNeighboringIslands(puzzle)
      expectNoLargeEmptyBands(puzzle)
      expect(hasBroadCoordinateUse(puzzle.islands, puzzle.width, puzzle.height)).toBe(true)
      expect(hasLocalIslandCoverage(puzzle.islands, puzzle.width, puzzle.height, 4)).toBe(true)
      const diagonals = puzzle.islands.filter((a) =>
        puzzle.islands.some((b) => Math.abs(a.x - b.x) === 1 && Math.abs(a.y - b.y) === 1),
      ).length
      expect(diagonals / puzzle.islands.length).toBeGreaterThan(0.5)
      expect(
        countSolutionsWithDeadline(puzzle, 2, { deadline: Date.now() + 2000, now: Date.now }),
      ).toEqual({ count: 1, timedOut: false })
    },
    10000,
  )

  it.each(categories)('has exactly one solution for %s', (category) => {
    const { puzzle } = generatePuzzle(category, 123456)
    expect(
      countSolutionsWithDeadline(puzzle, 2, { deadline: Date.now() + 2000, now: Date.now }),
    ).toEqual({ count: 1, timedOut: false })
  })

  it('is deterministic for a supplied seed', () => {
    expect(generatePuzzle('intro', 42)).toEqual(generatePuzzle('intro', 42))
  })

  it('keeps intro puzzles in the low-numbered range', () => {
    for (let seed = 0; seed < 5; seed += 1) {
      const { puzzle } = generatePuzzle('intro', 600_000 + seed)
      const clues = puzzle.islands.map(({ clue }) => clue)

      expect(Math.max(...clues)).toBeLessThanOrEqual(5)
      expect(assessDifficulty(puzzle)).toMatchObject({
        solved: true,
        difficulty: 'easy',
        contradiction: 0,
        connectivity: 0,
      })
    }
  })

  it.each(challengingCategories)(
    'keeps generated %s puzzles varied and graded by reasoning',
    (category) => {
      const ids = new Set<string>()
      for (let seed = 0; seed < 3; seed += 1) {
        const generated = generatePuzzle(category, 700_000 + seed, { now: () => 0 })
        expect(generated.source).toBe('generated')
        ids.add(generated.puzzle.id)
        expectBalancedChallenge(category, generated)

        const { puzzle, solution } = generated
        const islandById = new Map(puzzle.islands.map((island) => [island.id, island]))
        const selected = getVisibleCorridors(puzzle.islands).filter(({ id }) => solution[id] > 0)

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
      }
      expect(ids.size).toBe(3)
    },
    15000,
  )

  it.each(challengingCategories)(
    'gives every %s puzzle several opening deductions',
    (category) => {
      for (let seed = 0; seed < 3; seed += 1) {
        const { puzzle } = generatePuzzle(category, 730_000 + seed)

        expect(countOpeningDeductions(puzzle)).toBeGreaterThanOrEqual(
          CATEGORY_CONFIG[category].minimumOpeningDeductions,
        )
      }
    },
    15000,
  )

  it.each(categories)(
    'has distinct validated %s fallbacks',
    (category) => {
      const ids = new Set<string>()
      for (let seed = 0; seed < 8; seed++) {
        const generated = generateFallbackPuzzle(category, seed)
        ids.add(generated.puzzle.id)
        expect(evaluatePuzzle(generated.puzzle, generated.solution).solved).toBe(true)
        expect(
          countSolutionsWithDeadline(generated.puzzle, 2, {
            deadline: Date.now() + 2000,
            now: Date.now,
          }),
        ).toEqual({ count: 1, timedOut: false })
        expect(assessDifficulty(generated.puzzle)).toMatchObject({
          solved: true,
          difficulty: CATEGORY_CONFIG[category].difficulty,
        })
      }
      expect(ids.size).toBe(8)
      const mutated = generateFallbackPuzzle(category)
      mutated.puzzle.islands[0]!.clue = 99
      expect(generateFallbackPuzzle(category).puzzle.islands[0]!.clue).not.toBe(99)
    },
    15000,
  )

  it('returns the validated fallback when the overall generation budget is exhausted', () => {
    const generated = generatePuzzle('monthly', 42, {
      timeBudgetMs: 0,
      now: () => 100,
    })

    expect(generated).toEqual(generateFallbackPuzzle('monthly', 42))
    expect(generated.source).toBe('fallback')
    expect(generated.puzzle.islands).toHaveLength(CATEGORY_CONFIG.monthly.targetIslands)
    expect(generated.puzzle.id).toMatch(/^hashi-/)
    expect(evaluatePuzzle(generated.puzzle, generated.solution).solved).toBe(true)
  })

  it('reports fresh generation separately from fallback selection', () => {
    expect(generatePuzzle('intro', 42, { timeBudgetMs: 1, now: () => 0 }).source).toBe('generated')
    expect(cloneFallback('intro', 1).puzzle.id).not.toBe(cloneFallback('intro', 0).puzzle.id)
  })

  it.each(categories)('provides a full valid %s fallback', (category) => {
    const fallback = cloneFallback(category)

    expect(evaluatePuzzle(fallback.puzzle, fallback.solution).solved).toBe(true)
    expect(fallback.puzzle.width).toBe(CATEGORY_CONFIG[category].width)
    expect(fallback.puzzle.height).toBe(CATEGORY_CONFIG[category].height)
    expect(fallback.puzzle.islands).toHaveLength(CATEGORY_CONFIG[category].targetIslands)
    expect(
      countSolutionsWithDeadline(fallback.puzzle, 2, {
        deadline: Date.now() + 2000,
        now: Date.now,
      }),
    ).toEqual({ count: 1, timedOut: false })
    expect(assessDifficulty(fallback.puzzle)).toMatchObject({
      solved: true,
      difficulty: CATEGORY_CONFIG[category].difficulty,
    })
    expectIslandsTouchEveryBoundary(fallback.puzzle)
    expectNoNeighboringIslands(fallback.puzzle)
    expectNoLargeEmptyBands(fallback.puzzle)
    if (category !== 'intro') {
      expect(countOpeningDeductions(fallback.puzzle)).toBeGreaterThanOrEqual(
        CATEGORY_CONFIG[category].minimumOpeningDeductions,
      )
    }
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
