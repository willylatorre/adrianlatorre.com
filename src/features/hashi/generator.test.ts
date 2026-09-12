import { afterEach, describe, expect, it, vi } from 'vitest'
import { cloneFallback } from './fallbacks'
import { CATEGORY_CONFIG, countOpeningDeductions, generatePuzzle } from './generator'
import { corridorsCross, countCorridorCrossings, getVisibleCorridors } from './geometry'
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

const expectedDimensions: Record<HashiCategory, [number, number]> = {
  intro: [15, 15],
  daily: [15, 30],
  weekly: [18, 35],
  monthly: [20, 40],
}

const challengingCategories = ['daily', 'weekly', 'monthly'] as const
const minimumCrossingPairs = { daily: 4, weekly: 8, monthly: 12 } as const

function expectBalancedChallenge(
  category: (typeof challengingCategories)[number],
  generated: ReturnType<typeof generatePuzzle>,
) {
  const { puzzle, solution } = generated
  const histogram = new Map<number, number>()
  for (const { clue } of puzzle.islands) histogram.set(clue, (histogram.get(clue) ?? 0) + 1)

  const activeCounts = Object.values(solution).filter((count) => count > 0)
  const doubleShare = activeCounts.filter((count) => count === 2).length / activeCounts.length
  const highClueShare = ((histogram.get(6) ?? 0) + (histogram.get(7) ?? 0)) / puzzle.islands.length
  const eightShare = (histogram.get(8) ?? 0) / puzzle.islands.length
  const cycleEdges = activeCounts.length - puzzle.islands.length + 1

  expect(puzzle.id).not.toBe(`fallback-${category}`)
  for (let clue = 1; clue <= 7; clue += 1) expect(histogram.get(clue) ?? 0).toBeGreaterThan(0)
  for (let clue = 1; clue <= 5; clue += 1) {
    expect((histogram.get(clue) ?? 0) / puzzle.islands.length).toBeGreaterThanOrEqual(0.04)
  }
  expect(highClueShare).toBeGreaterThanOrEqual(0.04)
  expect(highClueShare).toBeLessThanOrEqual(0.25)
  expect(eightShare).toBeLessThanOrEqual(0.03)
  expect(doubleShare).toBeGreaterThanOrEqual(0.15)
  expect(doubleShare).toBeLessThanOrEqual(0.3)
  expect(countCorridorCrossings(puzzle.islands)).toBeGreaterThanOrEqual(
    minimumCrossingPairs[category],
  )
  expect(cycleEdges).toBeGreaterThanOrEqual(CATEGORY_CONFIG[category].targetCycleEdges)
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

function expectUsesConsecutiveCoordinateLines(puzzle: HashiPuzzle) {
  for (const coordinates of [puzzle.islands.map(({ x }) => x), puzzle.islands.map(({ y }) => y)]) {
    const occupied = [...new Set(coordinates)].sort((left, right) => left - right)

    expect(occupied.slice(1).some((coordinate, index) => coordinate - occupied[index]! === 1)).toBe(
      true,
    )
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
    const generated = generatePuzzle(category, 123456)

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

  it.each(categories)(
    'uses consecutive coordinate lines in representative %s layouts without neighboring islands',
    (category) => {
      const { puzzle } = generatePuzzle(category, 123456)

      expect(puzzle.id).not.toBe(`fallback-${category}`)
      expectUsesConsecutiveCoordinateLines(puzzle)
      expectNoNeighboringIslands(puzzle)
    },
  )

  it('is deterministic for a supplied seed', () => {
    expect(generatePuzzle('intro', 42)).toEqual(generatePuzzle('intro', 42))
  })

  it('keeps intro puzzles in the low-numbered range', () => {
    for (let seed = 0; seed < 5; seed += 1) {
      const { puzzle } = generatePuzzle('intro', 600_000 + seed)
      const clues = puzzle.islands.map(({ clue }) => clue)

      expect(puzzle.id).not.toBe('fallback-intro')
      expect(Math.max(...clues)).toBeLessThanOrEqual(5)
      for (let clue = 1; clue <= 4; clue += 1) expect(clues).toContain(clue)
    }
  })

  it.each(challengingCategories)(
    'keeps every generated %s puzzle balanced and challenging',
    (category) => {
      for (let seed = 0; seed < 3; seed += 1) {
        const generated = generatePuzzle(category, 700_000 + seed)
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
    },
  )

  it.each(challengingCategories)('gives every %s puzzle several opening deductions', (category) => {
    for (let seed = 0; seed < 3; seed += 1) {
      const { puzzle } = generatePuzzle(category, 730_000 + seed)

      expect(countOpeningDeductions(puzzle)).toBeGreaterThanOrEqual(
        CATEGORY_CONFIG[category].minimumOpeningDeductions,
      )
    }
  })

  it('returns the validated fallback when the overall generation budget is exhausted', () => {
    expect(
      generatePuzzle('monthly', 42, {
        timeBudgetMs: 0,
        now: () => 100,
      }),
    ).toEqual(cloneFallback('monthly'))
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
