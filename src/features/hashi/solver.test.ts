import { describe, expect, it } from 'vitest'
import { countSolutions, countSolutionsWithDeadline } from './solver'
import type { HashiPuzzle } from './types'

const forcedPuzzle: HashiPuzzle = {
  id: 'forced',
  category: 'intro',
  width: 7,
  height: 3,
  islands: [
    { id: 'a', x: 1, y: 1, clue: 1 },
    { id: 'b', x: 3, y: 1, clue: 2 },
    { id: 'c', x: 5, y: 1, clue: 1 },
  ],
}

describe('Hashi solution counter', () => {
  it('counts a forced puzzle as unique', () => {
    expect(countSolutions(forcedPuzzle, 2)).toBe(1)
  })

  it('stops at the requested solution limit', () => {
    const ambiguousPuzzle: HashiPuzzle = {
      id: 'ambiguous',
      category: 'intro',
      width: 5,
      height: 5,
      islands: [
        { id: 'a', x: 1, y: 1, clue: 3 },
        { id: 'b', x: 3, y: 1, clue: 3 },
        { id: 'c', x: 1, y: 3, clue: 3 },
        { id: 'd', x: 3, y: 3, clue: 3 },
      ],
    }

    expect(countSolutions(ambiguousPuzzle, 1)).toBe(1)
    expect(countSolutions(ambiguousPuzzle, 2)).toBe(2)
  })

  it('rejects an otherwise connected solution whose bridges cross', () => {
    const crossingPuzzle: HashiPuzzle = {
      id: 'crossing',
      category: 'intro',
      width: 5,
      height: 5,
      islands: [
        { id: 'a', x: 0, y: 2, clue: 2 },
        { id: 'b', x: 4, y: 2, clue: 1 },
        { id: 'c', x: 2, y: 0, clue: 2 },
        { id: 'd', x: 2, y: 4, clue: 1 },
        { id: 'e', x: 0, y: 0, clue: 2 },
      ],
    }

    expect(countSolutions(crossingPuzzle, 2)).toBe(0)
  })

  it('aborts recursive search safely when its deadline expires', () => {
    let clock = 0

    expect(
      countSolutionsWithDeadline(forcedPuzzle, 2, {
        deadline: 2,
        now: () => clock++,
      }),
    ).toEqual({ count: 0, timedOut: true })
  })
})
