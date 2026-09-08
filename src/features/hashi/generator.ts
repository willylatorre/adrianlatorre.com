import { cloneFallback } from './fallbacks'
import { corridorsCross, getVisibleCorridors } from './geometry'
import { countSolutionsWithDeadline } from './solver'
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

export interface PuzzleGenerationOptions {
  timeBudgetMs?: number
  uniquenessTimeBudgetMs?: number
  now?: () => number
}

type CategoryConfig = (typeof CATEGORY_CONFIG)[HashiCategory]
type Random = () => number

const DEFAULT_GENERATION_TIME_BUDGET_MS = 1_500
const DEFAULT_UNIQUENESS_TIME_BUDGET_MS = 250

export function generatePuzzle(
  category: HashiCategory,
  seed: number,
  options: PuzzleGenerationOptions = {},
): GeneratedPuzzle {
  const random = mulberry32(seed)
  const config = CATEGORY_CONFIG[category]
  const now = options.now ?? Date.now
  const generationDeadline = now() + (options.timeBudgetMs ?? DEFAULT_GENERATION_TIME_BUDGET_MS)
  const uniquenessTimeBudgetMs = options.uniquenessTimeBudgetMs ?? DEFAULT_UNIQUENESS_TIME_BUDGET_MS

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (now() >= generationDeadline) break

    const islands = placeGuardedCycleIslands(config, random)
    const corridors = getVisibleCorridors(islands)
    const solution = buildConnectedPlanarSolution(islands, corridors, config, random)
    if (!solution) continue

    const puzzle = deriveClues(
      { id: '', category, width: config.width, height: config.height, islands },
      corridors,
      solution,
    )
    const uniquenessDeadline = Math.min(generationDeadline, now() + uniquenessTimeBudgetMs)
    const solutionCount = countSolutionsWithDeadline(puzzle, 2, {
      deadline: uniquenessDeadline,
      now,
    })
    if (
      puzzle.islands.every(({ clue }) => clue >= 1 && clue <= 8) &&
      !solutionCount.timedOut &&
      solutionCount.count === 1
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

function placeGuardedCycleIslands(config: CategoryConfig, random: Random): Island[] {
  const gadgetCount = Math.min(5, Math.max(2, Math.round(config.targetIslands / 15)))
  const columnCounts = Array<number>(gadgetCount).fill(3)
  const rungCounts = Array<number>(gadgetCount).fill(1)
  const maxNonHubColumns = config.width - 3
  let usedNonHubColumns = gadgetCount * 2
  let remainingIslands = config.targetIslands - gadgetCount * 6

  while (remainingIslands > 0) {
    let placed = false

    for (let index = 0; index < gadgetCount && remainingIslands > 0; index += 1) {
      if (usedNonHubColumns >= maxNonHubColumns) break
      columnCounts[index]! += 1
      usedNonHubColumns += 1
      remainingIslands -= 1
      placed = true
    }
    for (let index = 0; index < gadgetCount && remainingIslands > 0; index += 1) {
      if (rungCounts[index]! >= columnCounts[index]! - 2) continue
      rungCounts[index]! += 1
      remainingIslands -= 1
      placed = true
    }

    if (!placed) return []
  }

  const xs = chooseCoordinates(config.width, usedNonHubColumns + 1, random)
  const ys = chooseCoordinates(config.height, gadgetCount * 3, random)
  const orderedXs = random() < 0.5 ? xs : [...xs].reverse()
  const hubX = orderedXs.at(-1)!
  let xIndex = 0
  const positions: Array<Pick<Island, 'x' | 'y'>> = []

  // Each three-row gadget has one outer rung that can close a planar cycle. Its inner rungs cross
  // the forced leaf-to-hub guard, keeping the legal graph a cactus when several cycles are selected.
  for (let gadgetIndex = 0; gadgetIndex < gadgetCount; gadgetIndex += 1) {
    const nonHubCount = columnCounts[gadgetIndex]! - 1
    const gadgetXs = [...orderedXs.slice(xIndex, xIndex + nonHubCount), hubX]
    const [outerX, leafX, ...fromLeafToHub] = gadgetXs
    const [topY, barrierY, bottomY] = ys.slice(gadgetIndex * 3, gadgetIndex * 3 + 3)
    const [longY, shortY] = random() < 0.5 ? [topY!, bottomY!] : [bottomY!, topY!]
    const shortXs = [outerX!, ...fromLeafToHub.slice(-rungCounts[gadgetIndex]!)]

    positions.push(
      { x: leafX!, y: barrierY! },
      { x: hubX, y: barrierY! },
      ...[outerX!, ...fromLeafToHub].map((x) => ({ x, y: longY })),
      ...shortXs.map((x) => ({ x, y: shortY })),
    )
    xIndex += nonHubCount
  }

  return positions.map(({ x, y }, index) => ({ id: `i${index}`, x, y, clue: 0 }))
}

function buildConnectedPlanarSolution(
  islands: Island[],
  corridors: Corridor[],
  config: CategoryConfig,
  random: Random,
): BridgeCounts | undefined {
  if (islands.length === 0) return undefined

  const islandById = new Map(islands.map((island) => [island.id, island]))
  const corridorCounts = new Map(islands.map(({ id }) => [id, 0]))
  for (const corridor of corridors) {
    corridorCounts.set(corridor.a, corridorCounts.get(corridor.a)! + 1)
    corridorCounts.set(corridor.b, corridorCounts.get(corridor.b)! + 1)
  }
  const guardCorridors = corridors.filter(
    (corridor) => corridorCounts.get(corridor.a) === 1 || corridorCounts.get(corridor.b) === 1,
  )
  const visited = new Set([islands[0]!.id])
  const activeCorridors: Corridor[] = []
  const solution: BridgeCounts = {}

  while (visited.size < islands.length) {
    const candidates = corridors.filter(
      (corridor) =>
        visited.has(corridor.a) !== visited.has(corridor.b) &&
        !crossesAny(corridor, guardCorridors, islandById) &&
        !crossesAny(corridor, activeCorridors, islandById),
    )
    if (candidates.length === 0) return undefined

    const corridor = candidates[randomIndex(candidates.length, random)]!
    solution[corridor.id] = sampleBridgeCount(config.doubleRate, random)
    activeCorridors.push(corridor)
    visited.add(visited.has(corridor.a) ? corridor.b : corridor.a)
  }

  for (const corridor of shuffled(corridors, random)) {
    if (solution[corridor.id] || random() >= config.extraEdgeRate) continue
    if (crossesAny(corridor, activeCorridors, islandById)) continue

    solution[corridor.id] = sampleBridgeCount(config.doubleRate, random)
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

function chooseCoordinates(size: number, count: number, random: Random) {
  return shuffled(
    Array.from({ length: size - 2 }, (_, index) => index + 1),
    random,
  )
    .slice(0, count)
    .sort((left, right) => left - right)
}

function sampleBridgeCount(doubleRate: number, random: Random) {
  return random() < doubleRate ? 2 : 1
}

function randomIndex(length: number, random: Random) {
  return Math.floor(random() * length)
}
