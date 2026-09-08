import { getVisibleCorridors } from './geometry'
import type { BridgeCounts, Corridor, HashiPuzzle, IslandState, PuzzleEvaluation } from './types'

export function getIslandTotal(id: string, corridors: Corridor[], counts: BridgeCounts) {
  return corridors.reduce(
    (sum, corridor) =>
      corridor.a === id || corridor.b === id ? sum + (counts[corridor.id] ?? 0) : sum,
    0,
  )
}

export function getIslandState(id: string, puzzle: HashiPuzzle, counts: BridgeCounts): IslandState {
  const island = puzzle.islands.find((candidate) => candidate.id === id)!
  const total = getIslandTotal(id, getVisibleCorridors(puzzle.islands), counts)

  return total === island.clue ? 'satisfied' : total > island.clue ? 'overfilled' : 'open'
}

export function evaluatePuzzle(puzzle: HashiPuzzle, counts: BridgeCounts): PuzzleEvaluation {
  const corridors = getVisibleCorridors(puzzle.islands)
  const allCountsMatch = puzzle.islands.every(
    (island) => getIslandTotal(island.id, corridors, counts) === island.clue,
  )
  const visited = new Set<string>()
  const queue = puzzle.islands.length ? [puzzle.islands[0]!.id] : []

  while (queue.length) {
    const id = queue.shift()!
    if (visited.has(id)) continue

    visited.add(id)
    for (const corridor of corridors) {
      if (!(counts[corridor.id] > 0)) continue
      if (corridor.a === id) queue.push(corridor.b)
      if (corridor.b === id) queue.push(corridor.a)
    }
  }

  const strandedIslandIds = puzzle.islands
    .filter((island) => !visited.has(island.id))
    .map((island) => island.id)
  const connected = puzzle.islands.length > 0 && strandedIslandIds.length === 0

  return {
    allCountsMatch,
    connected,
    solved: allCountsMatch && connected,
    strandedIslandIds,
  }
}
