import { getPuzzleTopology } from './geometry'
import type { BridgeCounts, Corridor, HashiPuzzle, IslandState, PuzzleEvaluation } from './types'

export function getIslandTotal(id: string, corridors: Corridor[], counts: BridgeCounts) {
  return corridors.reduce(
    (sum, corridor) =>
      corridor.a === id || corridor.b === id ? sum + (counts[corridor.id] ?? 0) : sum,
    0,
  )
}

export function getIslandState(id: string, puzzle: HashiPuzzle, counts: BridgeCounts): IslandState {
  const topology = getPuzzleTopology(puzzle)
  const island = topology.islandById.get(id)!
  const total = getIslandTotal(id, topology.incident.get(id)!, counts)

  return total === island.clue ? 'satisfied' : total > island.clue ? 'overfilled' : 'open'
}

/** Recompute once per position; hover only reads these flags. */
export function getBoardState(puzzle: HashiPuzzle, counts: BridgeCounts) {
  const topology = getPuzzleTopology(puzzle)
  const totals = new Map(topology.islands.map((island) => [island.id, 0]))
  const blocked = new Set<string>()
  for (const edge of topology.corridors) {
    const count = counts[edge.id] ?? 0
    totals.set(edge.a, totals.get(edge.a)! + count)
    totals.set(edge.b, totals.get(edge.b)! + count)
    if (count > 0) for (const crossing of topology.crossings.get(edge.id)!) blocked.add(crossing.id)
  }
  const states = new Map<string, IslandState>(
    topology.islands.map((island) => {
      const total = totals.get(island.id)!
      return [
        island.id,
        total === island.clue ? 'satisfied' : total > island.clue ? 'overfilled' : 'open',
      ]
    }),
  )
  return { totals, states, blocked }
}

export function evaluatePuzzle(puzzle: HashiPuzzle, counts: BridgeCounts): PuzzleEvaluation {
  const { corridors, incident } = getPuzzleTopology(puzzle)
  const allCountsMatch = puzzle.islands.every(
    (island) => getIslandTotal(island.id, corridors, counts) === island.clue,
  )
  const visited = new Set<string>()
  const queue = puzzle.islands.length ? [puzzle.islands[0]!.id] : []

  while (queue.length) {
    const id = queue.shift()!
    if (visited.has(id)) continue

    visited.add(id)
    for (const corridor of incident.get(id)!) {
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
