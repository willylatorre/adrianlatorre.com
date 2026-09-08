import type { BridgeCount, Corridor, HashiPuzzle, Island, LineSegment } from './types'

interface Point {
  x: number
  y: number
}

interface CorridorLine {
  a: Point
  b: Point
}

export function corridorId(a: string, b: string) {
  return [a, b].sort().join(':')
}

export function getVisibleCorridors(islands: Island[]): Corridor[] {
  const result = new Map<string, Corridor>()

  for (const island of islands) {
    const candidates = islands.filter(
      (other) => other.id !== island.id && (other.x === island.x || other.y === island.y),
    )

    for (const axis of ['horizontal', 'vertical'] as const) {
      const aligned = candidates.filter((other) =>
        axis === 'horizontal' ? other.y === island.y : other.x === island.x,
      )

      for (const direction of [-1, 1]) {
        const visible = aligned
          .filter(
            (other) =>
              direction * (axis === 'horizontal' ? other.x - island.x : other.y - island.y) > 0,
          )
          .sort(
            (left, right) =>
              Math.abs(
                (axis === 'horizontal' ? left.x : left.y) -
                  (axis === 'horizontal' ? island.x : island.y),
              ) -
              Math.abs(
                (axis === 'horizontal' ? right.x : right.y) -
                  (axis === 'horizontal' ? island.x : island.y),
              ),
          )[0]

        if (!visible) continue

        const id = corridorId(island.id, visible.id)
        const [a, b] = [island.id, visible.id].sort()
        result.set(id, { id, a, b, axis })
      }
    }
  }

  return [...result.values()].sort((left, right) => left.id.localeCompare(right.id))
}

export function bridgeSegments(
  corridor: Corridor,
  puzzle: HashiPuzzle,
  cell: number,
  halfIsland: number,
  count: BridgeCount,
): LineSegment[] {
  const a = puzzle.islands.find((island) => island.id === corridor.a)!
  const b = puzzle.islands.find((island) => island.id === corridor.b)!
  const start = { x: a.x * cell, y: a.y * cell }
  const end = { x: b.x * cell, y: b.y * cell }
  const direction = { x: Math.sign(end.x - start.x), y: Math.sign(end.y - start.y) }
  const offsets = count === 2 ? [-3, 3] : count === 1 ? [0] : []

  return offsets.map((offset) => ({
    x1: start.x + direction.x * halfIsland + (corridor.axis === 'vertical' ? offset : 0),
    y1: start.y + direction.y * halfIsland + (corridor.axis === 'horizontal' ? offset : 0),
    x2: end.x - direction.x * halfIsland + (corridor.axis === 'vertical' ? offset : 0),
    y2: end.y - direction.y * halfIsland + (corridor.axis === 'horizontal' ? offset : 0),
  }))
}

export function corridorsCross(first: CorridorLine, second: CorridorLine) {
  const firstHorizontal = first.a.y === first.b.y
  const firstVertical = first.a.x === first.b.x
  const secondHorizontal = second.a.y === second.b.y
  const secondVertical = second.a.x === second.b.x

  if (firstHorizontal && secondVertical) {
    return (
      isStrictlyBetween(second.a.x, first.a.x, first.b.x) &&
      isStrictlyBetween(first.a.y, second.a.y, second.b.y)
    )
  }

  if (firstVertical && secondHorizontal) {
    return (
      isStrictlyBetween(first.a.x, second.a.x, second.b.x) &&
      isStrictlyBetween(second.a.y, first.a.y, first.b.y)
    )
  }

  return false
}

function isStrictlyBetween(value: number, endpointA: number, endpointB: number) {
  return value > Math.min(endpointA, endpointB) && value < Math.max(endpointA, endpointB)
}
