import { corridorsCross, getVisibleCorridors } from './geometry'
import { evaluatePuzzle } from './rules'
import type { BridgeCount, BridgeCounts, Corridor, HashiPuzzle } from './types'

interface SolverCorridor extends Corridor {
  aIndex: number
  bIndex: number
  crossingIndexes: number[]
}

const VALUES: BridgeCount[] = [0, 1, 2]

export function countSolutions(puzzle: HashiPuzzle, limit = 2): number {
  if (limit <= 0 || puzzle.islands.length === 0) return 0

  const corridors = prepareCorridors(puzzle)
  const clues = puzzle.islands.map(({ clue }) => clue)
  const sums = new Int16Array(puzzle.islands.length)
  const remaining = new Int16Array(puzzle.islands.length)
  const assignments = new Int8Array(corridors.length).fill(-1)
  const counts: BridgeCounts = {}
  let solutions = 0

  for (const corridor of corridors) {
    remaining[corridor.aIndex] += 1
    remaining[corridor.bIndex] += 1
  }

  if (
    puzzle.islands.some((_, index) => clues[index]! < 0 || clues[index]! > remaining[index]! * 2)
  ) {
    return 0
  }

  function search(assignedCount: number) {
    if (solutions >= limit) return
    if (assignedCount === corridors.length) {
      if (evaluatePuzzle(puzzle, counts).solved) solutions += 1
      return
    }

    const choice = chooseCorridor(corridors, assignments, sums, remaining, clues)
    if (!choice) return

    const { corridorIndex, allowedValues } = choice
    const corridor = corridors[corridorIndex]!
    assignments[corridorIndex] = 0
    remaining[corridor.aIndex] -= 1
    remaining[corridor.bIndex] -= 1

    for (const value of allowedValues) {
      assignments[corridorIndex] = value
      counts[corridor.id] = value
      sums[corridor.aIndex] += value
      sums[corridor.bIndex] += value

      if (!hasClosedComponent(puzzle.islands.length, corridors, assignments, sums, clues)) {
        search(assignedCount + 1)
      }

      sums[corridor.aIndex] -= value
      sums[corridor.bIndex] -= value
      if (solutions >= limit) break
    }

    remaining[corridor.aIndex] += 1
    remaining[corridor.bIndex] += 1
    assignments[corridorIndex] = -1
    delete counts[corridor.id]
  }

  search(0)
  return solutions
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

function chooseCorridor(
  corridors: SolverCorridor[],
  assignments: Int8Array,
  sums: Int16Array,
  remaining: Int16Array,
  clues: number[],
) {
  let best:
    | { corridorIndex: number; allowedValues: BridgeCount[]; endpointCapacity: number }
    | undefined

  for (let index = 0; index < corridors.length; index += 1) {
    if (assignments[index] !== -1) continue

    const corridor = corridors[index]!
    const aNeeded = clues[corridor.aIndex]! - sums[corridor.aIndex]!
    const bNeeded = clues[corridor.bIndex]! - sums[corridor.bIndex]!
    const crossingIsActive = corridor.crossingIndexes.some(
      (crossingIndex) => assignments[crossingIndex]! > 0,
    )
    const lower = Math.max(
      0,
      aNeeded - 2 * (remaining[corridor.aIndex]! - 1),
      bNeeded - 2 * (remaining[corridor.bIndex]! - 1),
    )
    const upper = crossingIsActive ? 0 : Math.min(2, aNeeded, bNeeded)
    const allowedValues = VALUES.filter((value) => value >= lower && value <= upper)

    if (allowedValues.length === 0) return undefined

    const endpointCapacity = Math.min(aNeeded, bNeeded)
    if (
      !best ||
      allowedValues.length < best.allowedValues.length ||
      (allowedValues.length === best.allowedValues.length &&
        endpointCapacity < best.endpointCapacity)
    ) {
      best = { corridorIndex: index, allowedValues, endpointCapacity }
      if (allowedValues.length === 1 && endpointCapacity === 0) break
    }
  }

  return best
}

function hasClosedComponent(
  islandCount: number,
  corridors: SolverCorridor[],
  assignments: Int8Array,
  sums: Int16Array,
  clues: number[],
) {
  const visited = new Uint8Array(islandCount)

  for (let start = 0; start < islandCount; start += 1) {
    if (visited[start]) continue

    const stack = [start]
    const component: number[] = []
    visited[start] = 1

    while (stack.length) {
      const islandIndex = stack.pop()!
      component.push(islandIndex)

      for (let corridorIndex = 0; corridorIndex < corridors.length; corridorIndex += 1) {
        if (!(assignments[corridorIndex]! > 0)) continue
        const corridor = corridors[corridorIndex]!
        const neighbor =
          corridor.aIndex === islandIndex
            ? corridor.bIndex
            : corridor.bIndex === islandIndex
              ? corridor.aIndex
              : -1
        if (neighbor >= 0 && !visited[neighbor]) {
          visited[neighbor] = 1
          stack.push(neighbor)
        }
      }
    }

    if (
      component.length < islandCount &&
      component.every((islandIndex) => sums[islandIndex] === clues[islandIndex])
    ) {
      return true
    }
  }

  return false
}
