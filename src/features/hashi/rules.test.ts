import { describe, expect, it } from 'vitest'
import { evaluatePuzzle, getIslandState } from './rules'
import type { HashiPuzzle } from './types'

const puzzle: HashiPuzzle = {
  id: 'test',
  category: 'intro',
  width: 7,
  height: 7,
  islands: [
    { id: 'a', x: 1, y: 1, clue: 1 },
    { id: 'b', x: 5, y: 1, clue: 1 },
    { id: 'c', x: 3, y: 3, clue: 2 },
    { id: 'd', x: 3, y: 5, clue: 2 },
  ],
}

describe('Hashi rules', () => {
  it('distinguishes satisfied and overfilled islands', () => {
    expect(getIslandState('a', puzzle, { 'a:b': 1 })).toBe('satisfied')
    expect(getIslandState('a', puzzle, { 'a:b': 2 })).toBe('overfilled')
  })

  it('rejects locally satisfied but stranded groups', () => {
    const disconnected: HashiPuzzle = {
      id: 'stranded',
      category: 'intro',
      width: 7,
      height: 3,
      islands: [
        { id: 'a', x: 0, y: 0, clue: 1 },
        { id: 'b', x: 2, y: 0, clue: 1 },
        { id: 'c', x: 4, y: 2, clue: 1 },
        { id: 'd', x: 6, y: 2, clue: 1 },
      ],
    }

    expect(evaluatePuzzle(disconnected, { 'a:b': 1, 'c:d': 1 })).toMatchObject({
      allCountsMatch: true,
      connected: false,
      solved: false,
    })
  })
})
