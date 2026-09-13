import { corridorsCross, getVisibleCorridors } from './geometry'
import type { BridgeCounts, Corridor, HashiPuzzle } from './types'

interface SolverCorridor extends Corridor {
  aIndex: number
  bIndex: number
  crossingIndexes: number[]
}

export interface SolutionSearchDeadline {
  deadline: number
  now: () => number
  nodeLimit?: number
}

export interface SolutionCountResult {
  count: number
  timedOut: boolean
}

export function countSolutions(puzzle: HashiPuzzle, limit = 2): number {
  return countSolutionsWithDeadline(puzzle, limit).count
}

export function countSolutionsWithDeadline(
  puzzle: HashiPuzzle,
  limit = 2,
  deadline?: SolutionSearchDeadline,
): SolutionCountResult {
  const result = findSolutions(puzzle, limit, deadline)
  return { count: result.solutions.length, timedOut: result.timedOut }
}

/** Interval propagation plus search. A timed-out search never proves uniqueness. */
export function findSolutions(
  puzzle: HashiPuzzle,
  limit = 2,
  deadline?: SolutionSearchDeadline,
  preferred?: BridgeCounts,
): { solutions: BridgeCounts[]; timedOut: boolean } {
  const solutions: BridgeCounts[] = []
  let timedOut = false
  let nodes = 0
  if (limit <= 0 || !puzzle.islands.length) return { solutions, timedOut }
  const corridors = prepareCorridors(puzzle)
  const incident = puzzle.islands.map(() => [] as number[])
  for (const [index, edge] of corridors.entries()) {
    incident[edge.aIndex]!.push(index)
    incident[edge.bIndex]!.push(index)
  }
  const clues = puzzle.islands.map((i) => i.clue)
  if (clues.some((clue) => !Number.isInteger(clue) || clue < 1 || clue > 8))
    return { solutions, timedOut }

  function expired() {
    if (deadline && deadline.now() >= deadline.deadline) timedOut = true
    return timedOut
  }

  function propagate(low: Int8Array, high: Int8Array): boolean {
    let changed = true
    while (changed) {
      if (expired()) return false
      changed = false
      for (let island = 0; island < clues.length; island++) {
        const edges = incident[island]!
        let min = 0,
          max = 0
        for (const e of edges) {
          min += low[e]!
          max += high[e]!
        }
        const clue = clues[island]!
        if (min > clue || max < clue) return false
        for (const e of edges) {
          const nextLow = Math.max(low[e]!, clue - max + high[e]!)
          const nextHigh = Math.min(high[e]!, clue - min + low[e]!)
          if (nextLow > nextHigh) return false
          if (nextLow !== low[e] || nextHigh !== high[e]) changed = true
          low[e] = nextLow
          high[e] = nextHigh
        }
      }
      for (let e = 0; e < corridors.length; e++) {
        if (!low[e]) continue
        for (const cross of corridors[e]!.crossingIndexes) {
          if (low[cross]! > 0) return false
          if (high[cross]! > 0) {
            high[cross] = 0
            changed = true
          }
        }
      }
      // Every island must remain reachable. A cut edge of the possible graph
      // must carry a bridge, even when neither endpoint's clue forces it yet.
      const discovery = new Int32Array(clues.length).fill(-1)
      const reachable = new Int32Array(clues.length)
      let time = 0
      function visit(node: number, parentEdge: number) {
        discovery[node] = reachable[node] = time++
        for (const e of incident[node]!) {
          if (!high[e] || e === parentEdge) continue
          const edge = corridors[e]!
          const other = edge.aIndex === node ? edge.bIndex : edge.aIndex
          if (discovery[other] === -1) {
            visit(other, e)
            reachable[node] = Math.min(reachable[node]!, reachable[other]!)
            if (reachable[other]! > discovery[node]! && low[e] === 0) {
              low[e] = 1
              changed = true
            }
          } else reachable[node] = Math.min(reachable[node]!, discovery[other]!)
        }
      }
      visit(0, -1)
      if (time !== clues.length) return false
    }
    return true
  }

  function search(low: Int8Array, high: Int8Array) {
    if (deadline?.nodeLimit !== undefined && ++nodes > deadline.nodeLimit) timedOut = true
    if (solutions.length >= limit || expired() || !propagate(low, high)) return
    let choice = -1
    let best = -Infinity
    for (let e = 0; e < corridors.length; e++) {
      const range = high[e]! - low[e]!
      if (!range) continue
      const edge = corridors[e]!
      const score =
        -range * 100 + edge.crossingIndexes.length + clues[edge.aIndex]! + clues[edge.bIndex]!
      if (score > best) {
        best = score
        choice = e
      }
    }
    if (choice < 0) {
      solutions.push(
        Object.fromEntries(corridors.map((edge, e) => [edge.id, low[e]])) as BridgeCounts,
      )
      return
    }
    const values = [0, 1, 2].filter((value) => value >= low[choice]! && value <= high[choice]!)
    const preferredValue = preferred?.[corridors[choice]!.id]
    if (preferredValue !== undefined)
      values.sort((a, b) => Number(b === preferredValue) - Number(a === preferredValue))
    for (const value of values) {
      const nextLow = low.slice(),
        nextHigh = high.slice()
      nextLow[choice] = nextHigh[choice] = value
      search(nextLow, nextHigh)
      if (timedOut || solutions.length >= limit) break
    }
  }

  search(new Int8Array(corridors.length), new Int8Array(corridors.length).fill(2))
  return { solutions, timedOut }
}

function prepareCorridors(puzzle: HashiPuzzle): SolverCorridor[] {
  const islandIndexes = new Map(puzzle.islands.map(({ id }, index) => [id, index]))
  const islands = new Map(puzzle.islands.map((island) => [island.id, island]))
  const corridors = getVisibleCorridors(puzzle.islands).map((corridor) => ({
    ...corridor,
    aIndex: islandIndexes.get(corridor.a)!,
    bIndex: islandIndexes.get(corridor.b)!,
    crossingIndexes: [] as number[],
  }))

  for (let firstIndex = 0; firstIndex < corridors.length; firstIndex += 1) {
    const first = corridors[firstIndex]!
    for (let secondIndex = firstIndex + 1; secondIndex < corridors.length; secondIndex += 1) {
      const second = corridors[secondIndex]!
      if (
        corridorsCross(
          { a: islands.get(first.a)!, b: islands.get(first.b)! },
          { a: islands.get(second.a)!, b: islands.get(second.b)! },
        )
      ) {
        first.crossingIndexes.push(secondIndex)
        second.crossingIndexes.push(firstIndex)
      }
    }
  }

  return corridors
}
