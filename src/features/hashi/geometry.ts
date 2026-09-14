import type { BridgeCount, Corridor, HashiPuzzle, Island, LineSegment } from './types'

interface Point {
  x: number
  y: number
}

interface CorridorLine {
  a: Point
  b: Point
}

export interface PuzzleTopology {
  islands: Island[]
  islandById: Map<string, Island>
  islandIndexes: Map<string, number>
  corridors: Corridor[]
  incident: Map<string, Corridor[]>
  crossings: Map<string, Corridor[]>
  incidentIndexes: number[][]
  crossingIndexes: number[][]
}

const topologyCache = new WeakMap<HashiPuzzle, PuzzleTopology>()

/** Puzzles are immutable; bridge counts are deliberately not part of this cache. */
export function getPuzzleTopology(puzzle: HashiPuzzle): PuzzleTopology {
  const cached = topologyCache.get(puzzle)
  if (cached) return cached
  const islands = [...puzzle.islands].sort((a, b) => a.y - b.y || a.x - b.x)
  const islandById = new Map(islands.map((island) => [island.id, island]))
  const islandIndexes = new Map(islands.map((island, index) => [island.id, index]))
  const endpoints = (edge: Corridor) =>
    [islandIndexes.get(edge.a)!, islandIndexes.get(edge.b)!].sort((a, b) => a - b)
  const corridors = getVisibleCorridors(islands).sort((a, b) => {
    const [a0, a1] = endpoints(a)
    const [b0, b1] = endpoints(b)
    return a0! - b0! || a1! - b1!
  })
  const incident = new Map(islands.map((island) => [island.id, [] as Corridor[]]))
  const crossings = new Map(corridors.map((edge) => [edge.id, [] as Corridor[]]))
  const incidentIndexes = islands.map(() => [] as number[])
  const crossingIndexes = corridors.map(() => [] as number[])
  for (const [index, edge] of corridors.entries()) {
    for (const id of [edge.a, edge.b]) {
      incident.get(id)!.push(edge)
      incidentIndexes[islandIndexes.get(id)!]!.push(index)
    }
    for (let otherIndex = index + 1; otherIndex < corridors.length; otherIndex++) {
      const other = corridors[otherIndex]!
      if (
        !corridorsCross(
          { a: islandById.get(edge.a)!, b: islandById.get(edge.b)! },
          { a: islandById.get(other.a)!, b: islandById.get(other.b)! },
        )
      )
        continue
      crossings.get(edge.id)!.push(other)
      crossings.get(other.id)!.push(edge)
      crossingIndexes[index]!.push(otherIndex)
      crossingIndexes[otherIndex]!.push(index)
    }
  }
  const topology = {
    islands,
    islandById,
    islandIndexes,
    corridors,
    incident,
    crossings,
    incidentIndexes,
    crossingIndexes,
  }
  topologyCache.set(puzzle, topology)
  return topology
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
  const { islandById } = getPuzzleTopology(puzzle)
  const a = islandById.get(corridor.a)!
  const b = islandById.get(corridor.b)!
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

export function countCorridorCrossings(
  islands: Island[],
  corridors = getVisibleCorridors(islands),
) {
  const islandById = new Map(islands.map((island) => [island.id, island]))
  let count = 0

  for (const [index, first] of corridors.entries()) {
    for (const second of corridors.slice(index + 1)) {
      if (
        corridorsCross(
          { a: islandById.get(first.a)!, b: islandById.get(first.b)! },
          { a: islandById.get(second.a)!, b: islandById.get(second.b)! },
        )
      ) {
        count += 1
      }
    }
  }

  return count
}

export function wouldCrossActiveBridge(
  candidate: Corridor,
  puzzle: HashiPuzzle,
  counts: Record<string, number>,
) {
  return getPuzzleTopology(puzzle)
    .crossings.get(candidate.id)!
    .some((active) => (counts[active.id] ?? 0) > 0)
}

function isStrictlyBetween(value: number, endpointA: number, endpointB: number) {
  return value > Math.min(endpointA, endpointB) && value < Math.max(endpointA, endpointB)
}
