import { describe, expect, it } from 'vitest'
import { generatePuzzle } from './generator'
import { findHashiHint, type HashiHintRule } from './hints'
import type { BridgeCounts, HashiCategory, HashiPuzzle } from './types'

function puzzle(islands: HashiPuzzle['islands'], width = 5, height = 5): HashiPuzzle {
  return { id: 'hint-test', category: 'intro', width, height, islands }
}

// Geometric scan order may find another forced move first. Follow legal hints
// until the technique under test is reached, rather than relying on array order.
function nextRule(puzzle: HashiPuzzle, rule: HashiHintRule, initial: BridgeCounts = {}) {
  const counts = { ...initial }
  for (let step = 0; step < 30; step++) {
    const result = findHashiHint(puzzle, counts)
    if (result.kind !== 'hint' || result.hint.rule === rule) return result
    counts[result.hint.corridorId] = result.hint.minimumCount
  }
  throw new Error(`Did not reach ${rule}`)
}

describe('Hashi hints', () => {
  it("forces the full clue through an island's only route", () => {
    const result = findHashiHint(
      puzzle([
        { id: 'a', x: 0, y: 2, clue: 2 },
        { id: 'b', x: 4, y: 2, clue: 2 },
      ]),
      {},
    )

    expect(result).toMatchObject({
      kind: 'hint',
      hint: {
        corridorId: 'a:b',
        minimumCount: 2,
        rule: 'only-route',
      },
    })
  })

  it('finds the all-but-one deduction on an edge 5', () => {
    const result = nextRule(
      puzzle([
        { id: 'center', x: 2, y: 0, clue: 5 },
        { id: 'left', x: 0, y: 0, clue: 2 },
        { id: 'right', x: 4, y: 0, clue: 2 },
        { id: 'down', x: 2, y: 4, clue: 2 },
      ]),
      'capacity',
    )

    expect(result).toMatchObject({
      kind: 'hint',
      hint: {
        minimumCount: 1,
        rule: 'capacity',
        title: 'Capacity rule',
      },
    })
  })

  it.each([
    { clue: 7, minimumCount: 1 },
    { clue: 8, minimumCount: 2 },
  ])('applies the middle-$clue capacity technique', ({ clue, minimumCount }) => {
    const result = nextRule(
      puzzle([
        { id: 'center', x: 2, y: 2, clue },
        { id: 'left', x: 0, y: 2, clue: 2 },
        { id: 'right', x: 4, y: 2, clue: 2 },
        { id: 'up', x: 2, y: 0, clue: 2 },
        { id: 'down', x: 2, y: 4, clue: 2 },
      ]),
      'capacity',
    )

    expect(result).toMatchObject({
      kind: 'hint',
      hint: { minimumCount, rule: 'capacity' },
    })
  })

  it('applies the middle 6 facing a 1 technique', () => {
    const result = nextRule(
      puzzle([
        { id: 'center', x: 2, y: 2, clue: 6 },
        { id: 'left', x: 0, y: 2, clue: 2 },
        { id: 'right', x: 4, y: 2, clue: 2 },
        { id: 'one', x: 2, y: 0, clue: 1 },
        { id: 'down', x: 2, y: 4, clue: 2 },
      ]),
      'capacity',
    )

    expect(result).toMatchObject({
      kind: 'hint',
      hint: { corridorId: 'center:right', minimumCount: 1, rule: 'capacity' },
    })
  })

  it('explains when a crossing bridge closes a route and forces another', () => {
    const crossingPressure = puzzle([
      { id: 'x', x: 0, y: 2, clue: 2 },
      { id: 'v', x: 0, y: 4, clue: 2 },
      { id: 'c', x: 2, y: 0, clue: 2 },
      { id: 'd', x: 2, y: 4, clue: 2 },
      { id: 'cr', x: 4, y: 0, clue: 2 },
      { id: 'h', x: 4, y: 2, clue: 2 },
      { id: 'dr', x: 4, y: 4, clue: 2 },
    ])

    expect(nextRule(crossingPressure, 'crossing', { 'c:d': 1 })).toMatchObject({
      kind: 'hint',
      hint: {
        corridorId: 'v:x',
        minimumCount: 2,
        rule: 'crossing',
        title: 'Crossing rule',
      },
    })
  })

  it('uses the only remaining exit from a partial connected group', () => {
    const twoSquares = puzzle(
      [
        { id: 'a', x: 0, y: 0, clue: 3 },
        { id: 'b', x: 2, y: 0, clue: 3 },
        { id: 'c', x: 0, y: 2, clue: 3 },
        { id: 'd', x: 2, y: 2, clue: 3 },
        { id: 'e', x: 4, y: 2, clue: 3 },
        { id: 'f', x: 6, y: 2, clue: 3 },
        { id: 'g', x: 4, y: 4, clue: 3 },
        { id: 'h', x: 6, y: 4, clue: 3 },
      ],
      7,
      5,
    )
    const counts = {
      'a:b': 1,
      'a:c': 1,
      'b:d': 1,
      'c:d': 1,
      'e:f': 1,
      'e:g': 1,
      'f:h': 1,
      'g:h': 1,
    } as const

    expect(findHashiHint(twoSquares, counts)).toMatchObject({
      kind: 'hint',
      hint: {
        corridorId: 'd:e',
        minimumCount: 1,
        rule: 'connectivity',
        title: 'Keep it connected',
      },
    })
  })

  it('reports an overfilled island without suggesting a move', () => {
    const result = findHashiHint(
      puzzle([
        { id: 'a', x: 0, y: 2, clue: 1 },
        { id: 'b', x: 4, y: 2, clue: 1 },
      ]),
      { 'a:b': 2 },
    )

    expect(result).toMatchObject({ kind: 'invalid' })
    expect(result).toHaveProperty('message', expect.stringContaining('overfilled'))
  })

  it('reports when an island no longer has enough available capacity', () => {
    const result = findHashiHint(
      puzzle([
        { id: 'a', x: 0, y: 2, clue: 3 },
        { id: 'b', x: 4, y: 2, clue: 2 },
      ]),
      {},
    )

    expect(result).toMatchObject({ kind: 'invalid' })
    expect(result).toHaveProperty('message', expect.stringContaining('enough room'))
  })

  it('reports a completed component that strands the rest of the board', () => {
    const closedPair = puzzle([
      { id: 'a', x: 0, y: 0, clue: 1 },
      { id: 'b', x: 2, y: 0, clue: 1 },
      { id: 'c', x: 0, y: 2, clue: 1 },
      { id: 'd', x: 2, y: 2, clue: 1 },
    ])

    const result = findHashiHint(closedPair, { 'a:b': 1 })

    expect(result).toMatchObject({ kind: 'invalid' })
    expect(result).toHaveProperty('message', expect.stringContaining('closed group'))
  })

  it('reports an unsatisfied component with no possible exit', () => {
    const disconnected = puzzle([
      { id: 'a', x: 0, y: 0, clue: 2 },
      { id: 'b', x: 2, y: 0, clue: 2 },
      { id: 'c', x: 1, y: 2, clue: 2 },
      { id: 'd', x: 3, y: 2, clue: 2 },
    ])

    const result = findHashiHint(disconnected, { 'a:b': 1 })

    expect(result).toMatchObject({ kind: 'invalid' })
    expect(result).toHaveProperty('message', expect.stringContaining('closed group'))
  })

  it('uses a bounded contradiction when direct rules do not choose a route', () => {
    const square = puzzle([
      { id: 'a', x: 0, y: 0, clue: 2 },
      { id: 'b', x: 4, y: 0, clue: 2 },
      { id: 'c', x: 0, y: 4, clue: 2 },
      { id: 'd', x: 4, y: 4, clue: 2 },
    ])

    expect(findHashiHint(square, {})).toMatchObject({
      kind: 'hint',
      hint: {
        corridorId: 'a:b',
        minimumCount: 1,
        rule: 'contradiction',
        title: 'Contradiction check',
      },
    })
  })

  it('returns no hint when the puzzle is already complete', () => {
    const result = findHashiHint(
      puzzle([
        { id: 'a', x: 0, y: 2, clue: 1 },
        { id: 'b', x: 4, y: 2, clue: 1 },
      ]),
      { 'a:b': 1 },
    )

    expect(result).toEqual({ kind: 'none', message: 'This puzzle is already complete.' })
  })

  it.each<HashiCategory>(['intro', 'daily', 'weekly', 'monthly'])(
    'finds an honest opening hint on a generated %s puzzle',
    (category) => {
      const generated = generatePuzzle(category, 91_337)

      expect(findHashiHint(generated.puzzle, {})).toMatchObject({ kind: 'hint' })
    },
  )
})
