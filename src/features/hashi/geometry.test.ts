import { describe, expect, it } from 'vitest'
import {
  bridgeSegments,
  corridorsCross,
  countCorridorCrossings,
  getVisibleCorridors,
  wouldCrossActiveBridge,
} from './geometry'
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

describe('Hashi geometry', () => {
  it('finds nearest visible orthogonal islands only', () => {
    expect(getVisibleCorridors(puzzle.islands).map(({ a, b }) => [a, b])).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('stops visible lines at 19-unit rounded-square edges', () => {
    const [segment] = bridgeSegments(
      { id: 'a:b', a: 'a', b: 'b', axis: 'horizontal' },
      puzzle,
      40,
      19,
      1,
    )
    expect(segment).toEqual({ x1: 59, y1: 40, x2: 181, y2: 40 })
  })

  it('offsets double bridges symmetrically', () => {
    const segments = bridgeSegments(
      { id: 'c:d', a: 'c', b: 'd', axis: 'vertical' },
      puzzle,
      40,
      19,
      2,
    )
    expect(segments.map((line) => line.x1)).toEqual([117, 123])
  })

  it('detects only interior perpendicular crossings', () => {
    expect(
      corridorsCross(
        { a: { x: 0, y: 2 }, b: { x: 4, y: 2 } },
        { a: { x: 2, y: 0 }, b: { x: 2, y: 4 } },
      ),
    ).toBe(true)
  })

  it('does not treat shared endpoints as crossings', () => {
    expect(
      corridorsCross(
        { a: { x: 0, y: 2 }, b: { x: 4, y: 2 } },
        { a: { x: 2, y: 2 }, b: { x: 2, y: 4 } },
      ),
    ).toBe(false)
  })

  it('counts crossing choices in a set of visible corridors', () => {
    const islands = [
      { id: 'left', x: 0, y: 2, clue: 1 },
      { id: 'right', x: 4, y: 2, clue: 1 },
      { id: 'top', x: 2, y: 0, clue: 1 },
      { id: 'bottom', x: 2, y: 4, clue: 1 },
    ]

    expect(countCorridorCrossings(islands)).toBe(1)
  })

  it('finds active bridges that block a crossing corridor', () => {
    const crossingPuzzle: HashiPuzzle = {
      id: 'crossing',
      category: 'intro',
      width: 5,
      height: 5,
      islands: [
        { id: 'left', x: 0, y: 2, clue: 1 },
        { id: 'right', x: 4, y: 2, clue: 1 },
        { id: 'top', x: 2, y: 0, clue: 1 },
        { id: 'bottom', x: 2, y: 4, clue: 1 },
      ],
    }
    const corridors = getVisibleCorridors(crossingPuzzle.islands)
    const vertical = corridors.find((corridor) => corridor.id === 'bottom:top')!

    expect(wouldCrossActiveBridge(vertical, crossingPuzzle, { 'left:right': 1 })).toBe(true)
    expect(wouldCrossActiveBridge(vertical, crossingPuzzle, {})).toBe(false)
  })
})
