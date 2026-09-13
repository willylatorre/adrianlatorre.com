import { describe, expect, it } from 'vitest'
import { assessDifficulty, difficultyFromTrace } from './difficulty'
import type { HashiPuzzle } from './types'

const line: HashiPuzzle = {
  id: 'line',
  category: 'intro',
  width: 5,
  height: 1,
  islands: [
    { id: 'a', x: 0, y: 0, clue: 1 },
    { id: 'b', x: 2, y: 0, clue: 2 },
    { id: 'c', x: 4, y: 0, clue: 1 },
  ],
}

describe('reasoning difficulty', () => {
  it('grades a direct solve as easy', () => {
    expect(assessDifficulty(line)).toMatchObject({
      solved: true,
      difficulty: 'easy',
      contradiction: 0,
      connectivity: 0,
    })
  })
  it('does not turn a longer direct solve into a harder puzzle', () => {
    expect(difficultyFromTrace({ steps: 20, connectivity: 0, contradiction: 0 })).toBe('easy')
    expect(difficultyFromTrace({ steps: 400, connectivity: 0, contradiction: 0 })).toBe('easy')
  })
  it('uses the proportion of advanced deductions, not island count', () => {
    expect(difficultyFromTrace({ steps: 100, connectivity: 1, contradiction: 1 })).toBe('medium')
    expect(difficultyFromTrace({ steps: 100, connectivity: 1, contradiction: 3 })).toBe('hard')
    expect(difficultyFromTrace({ steps: 200, connectivity: 2, contradiction: 6 })).toBe('hard')
  })
  it('does not label an ambiguous stalled solve as hard', () => {
    const square: HashiPuzzle = {
      id: 'square',
      category: 'intro',
      width: 3,
      height: 3,
      islands: [
        [0, 0],
        [2, 0],
        [0, 2],
        [2, 2],
      ].map(([x, y], i) => ({ id: `${i}`, x: x!, y: y!, clue: 3 })),
    }
    expect(assessDifficulty(square)).toMatchObject({ solved: false, difficulty: null })
  })
  it('stops grading when its budget expires', () => {
    expect(assessDifficulty(line, () => true)).toMatchObject({
      solved: false,
      difficulty: null,
      timedOut: true,
    })
  })
})
