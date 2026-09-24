import { describe, expect, it } from 'vitest'
import { getPuzzleTopology } from './geometry'
import { buildIntersectionLookup, selectPointerCorridor } from './pointerSelection'
import type { HashiPuzzle } from './types'

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

const intersections = buildIntersectionLookup(getPuzzleTopology(crossingPuzzle), 40)

function select(overrides: Partial<Parameters<typeof selectPointerCorridor>[0]> = {}) {
  return selectPointerCorridor({
    point: { x: 80, y: 80 },
    movement: { x: 7, y: 1 },
    directCorridorId: 'bottom:top',
    previousCorridorId: null,
    previousIntersectionKey: null,
    blocked: new Set(),
    intersections,
    cellSize: 40,
    hotspotRadius: 12,
    ...overrides,
  })
}

describe('selectPointerCorridor', () => {
  it('uses pointer direction and keeps the choice when movement stops', () => {
    expect(select()).toEqual({ corridorId: 'left:right', intersectionKey: '80:80' })
    expect(
      select({
        point: { x: 81, y: 80 },
        movement: { x: 0, y: 0 },
        previousCorridorId: 'left:right',
        previousIntersectionKey: '80:80',
      }).corridorId,
    ).toBe('left:right')
  })

  it('falls back to the viable axis when the directional choice is blocked', () => {
    expect(select({ movement: { x: 1, y: 7 }, blocked: new Set(['bottom:top']) }).corridorId).toBe(
      'left:right',
    )
  })

  it('uses the direct target away from an intersection and rejects blocked targets', () => {
    expect(select({ point: { x: 40, y: 80 }, directCorridorId: 'left:right' }).corridorId).toBe(
      'left:right',
    )
    expect(
      select({
        point: { x: 40, y: 80 },
        directCorridorId: 'left:right',
        blocked: new Set(['left:right']),
      }).corridorId,
    ).toBeNull()
  })
})
