import { cloneFallback } from './fallbacks'
import { corridorsCross, getVisibleCorridors } from './geometry'
import { countSolutions } from './solver'
import type { BridgeCounts, Corridor, HashiCategory, HashiPuzzle, Island } from './types'

export const CATEGORY_CONFIG = {
  intro: { width: 15, height: 15, targetIslands: 18, extraEdgeRate: 0.08, doubleRate: 0.12 },
  daily: { width: 30, height: 15, targetIslands: 42, extraEdgeRate: 0.18, doubleRate: 0.22 },
  weekly: { width: 35, height: 18, targetIslands: 58, extraEdgeRate: 0.24, doubleRate: 0.28 },
  monthly: { width: 40, height: 20, targetIslands: 76, extraEdgeRate: 0.3, doubleRate: 0.34 },
} as const

export interface GeneratedPuzzle {
  puzzle: HashiPuzzle
  solution: BridgeCounts
}

type CategoryConfig = (typeof CATEGORY_CONFIG)[HashiCategory]
type Random = () => number

export function generatePuzzle(category: HashiCategory, seed: number): GeneratedPuzzle {
  const random = mulberry32(seed)
  const config = CATEGORY_CONFIG[category]

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const islands = placeSpacedIslands(config, random)
    const corridors = getVisibleCorridors(islands)
    const solution = buildConnectedPlanarSolution(islands, corridors, config, random)
    if (!solution) continue

    const puzzle = deriveClues(
      { id: '', category, width: config.width, height: config.height, islands },
      corridors,
      solution,
    )
    if (
      puzzle.islands.every(({ clue }) => clue >= 1 && clue <= 8) &&
      countSolutions(puzzle, 2) === 1
    ) {
      return { puzzle: { ...puzzle, id: fingerprintPuzzle(puzzle) }, solution }
    }
  }

  return cloneFallback(category)
}

function mulberry32(seed: number): Random {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function placeSpacedIslands(config: CategoryConfig, random: Random): Island[] {
  const candidates: Array<Pick<Island, 'x' | 'y'>> = []

  for (let y = 1; y < config.height - 1; y += 2) {
    for (let x = 1; x < config.width - 1; x += 2) candidates.push({ x, y })
  }

  const chosen = [candidates.splice(randomIndex(candidates.length, random), 1)[0]!]
  while (chosen.length < config.targetIslands) {
    const frontierIndexes = candidates.flatMap((candidate, index) =>
      chosen.some((island) => island.x === candidate.x || island.y === candidate.y) ? [index] : [],
    )
    if (frontierIndexes.length === 0) return []

    const candidateIndex = frontierIndexes[randomIndex(frontierIndexes.length, random)]!
    chosen.push(candidates.splice(candidateIndex, 1)[0]!)
  }

  return chosen.map(({ x, y }, index) => ({ id: `i${index}`, x, y, clue: 0 }))
}

function buildConnectedPlanarSolution(
  islands: Island[],
  corridors: Corridor[],
  config: CategoryConfig,
  random: Random,
): BridgeCounts | undefined {
  if (islands.length === 0) return undefined

  const islandById = new Map(islands.map((island) => [island.id, island]))
  const visited = new Set([islands[randomIndex(islands.length, random)]!.id])
  const activeCorridors: Corridor[] = []
  const solution: BridgeCounts = {}

  while (visited.size < islands.length) {
    const candidates = corridors.filter(
      (corridor) =>
        visited.has(corridor.a) !== visited.has(corridor.b) &&
        !crossesAny(corridor, activeCorridors, islandById),
    )
    if (candidates.length === 0) return undefined

    const corridor = candidates[randomIndex(candidates.length, random)]!
    // Saturating the connected backbone keeps large uniqueness checks predictably bounded.
    solution[corridor.id] = 2
    activeCorridors.push(corridor)
    visited.add(visited.has(corridor.a) ? corridor.b : corridor.a)
  }

  for (const corridor of shuffled(corridors, random)) {
    if (solution[corridor.id] || random() >= config.extraEdgeRate) continue
    if (crossesAny(corridor, activeCorridors, islandById)) continue

    solution[corridor.id] = random() < config.doubleRate ? 2 : 1
    activeCorridors.push(corridor)
  }

  return solution
}

function crossesAny(
  candidate: Corridor,
  activeCorridors: Corridor[],
  islandById: Map<string, Island>,
) {
  return activeCorridors.some((active) =>
    corridorsCross(
      { a: islandById.get(candidate.a)!, b: islandById.get(candidate.b)! },
      { a: islandById.get(active.a)!, b: islandById.get(active.b)! },
    ),
  )
}

function deriveClues(
  puzzle: HashiPuzzle,
  corridors: Corridor[],
  solution: BridgeCounts,
): HashiPuzzle {
  return {
    ...puzzle,
    islands: puzzle.islands.map((island) => ({
      ...island,
      clue: corridors.reduce(
        (total, corridor) =>
          corridor.a === island.id || corridor.b === island.id
            ? total + (solution[corridor.id] ?? 0)
            : total,
        0,
      ),
    })),
  }
}

function fingerprintPuzzle(puzzle: HashiPuzzle) {
  const serialized = `${puzzle.category}|${puzzle.width}|${puzzle.height}|${puzzle.islands
    .map(({ x, y, clue }) => `${x},${y},${clue}`)
    .sort()
    .join('|')}`
  let hash = 0x811c9dc5

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return `hashi-${puzzle.category}-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function shuffled<T>(values: T[], random: Random) {
  const result = [...values]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const otherIndex = randomIndex(index + 1, random)
    ;[result[index], result[otherIndex]] = [result[otherIndex]!, result[index]!]
  }

  return result
}

function randomIndex(length: number, random: Random) {
  return Math.floor(random() * length)
}
