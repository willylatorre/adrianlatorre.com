import { cloneFallback } from './fallbacks'
import { corridorsCross, countCorridorCrossings, getVisibleCorridors } from './geometry'
import type { BridgeCounts, Corridor, HashiCategory, HashiPuzzle, Island } from './types'

export const CATEGORY_CONFIG = {
  intro: {
    width: 15,
    height: 15,
    targetIslands: 32,
    targetCycleEdges: 0,
    minimumCrossingPairs: 0,
    minimumOpeningDeductions: 1,
  },
  daily: {
    width: 15,
    height: 30,
    targetIslands: 72,
    targetCycleEdges: 13,
    minimumCrossingPairs: 4,
    minimumOpeningDeductions: 5,
  },
  weekly: {
    width: 18,
    height: 35,
    targetIslands: 108,
    targetCycleEdges: 22,
    minimumCrossingPairs: 8,
    minimumOpeningDeductions: 8,
  },
  monthly: {
    width: 20,
    height: 40,
    targetIslands: 150,
    targetCycleEdges: 33,
    minimumCrossingPairs: 12,
    minimumOpeningDeductions: 12,
  },
} as const

export interface GeneratedPuzzle {
  puzzle: HashiPuzzle
  solution: BridgeCounts
}

export interface PuzzleGenerationOptions {
  timeBudgetMs?: number
  now?: () => number
}

type CategoryConfig = (typeof CATEGORY_CONFIG)[HashiCategory]
type Random = () => number

export const HASHI_GENERATOR_VERSION = 'v4'
const DEFAULT_GENERATION_TIME_BUDGET_MS = 3_000
const DOUBLE_BRIDGE_SHARE = 0.22

export function generatePuzzle(
  category: HashiCategory,
  seed: number,
  options: PuzzleGenerationOptions = {},
): GeneratedPuzzle {
  const random = mulberry32(seed)
  const config = CATEGORY_CONFIG[category]
  const now = options.now ?? Date.now
  const generationDeadline = now() + (options.timeBudgetMs ?? DEFAULT_GENERATION_TIME_BUDGET_MS)

  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (now() >= generationDeadline) break

    const islands = placeOrganicIslands(config, random, category === 'intro')
    const corridors = getVisibleCorridors(islands)
    const initialSolution = buildBalancedPlanarSolution(islands, corridors, config, random)
    if (!initialSolution) continue

    const initialPuzzle = deriveClues(
      { id: '', category, width: config.width, height: config.height, islands },
      corridors,
      initialSolution,
    )
    if (hasCategoryShape(initialPuzzle, initialSolution, corridors, config)) {
      return {
        puzzle: { ...initialPuzzle, id: fingerprintPuzzle(initialPuzzle) },
        solution: initialSolution,
      }
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

interface GridCell {
  x: number
  y: number
}

interface GridCandidate extends GridCell {
  newlyForbiddenCells: number
}

function placeOrganicIslands(
  config: CategoryConfig,
  random: Random,
  requirePlanarVisibility = false,
): Island[] {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const spineX = 2 + randomIndex(config.width - 4, random)
    const spineY = 2 + randomIndex(config.height - 4, random)
    const cells: GridCell[] = [
      { x: spineX, y: 0 },
      { x: spineX, y: config.height - 1 },
      { x: 0, y: spineY },
      { x: config.width - 1, y: spineY },
      { x: spineX, y: spineY },
    ]
    const forbidden = new Set<string>()
    for (const cell of cells) forbidNeighboringCells(cell, forbidden, config)

    while (cells.length < config.targetIslands) {
      const usedXs = new Set(cells.map(({ x }) => x))
      const usedYs = new Set(cells.map(({ y }) => y))
      const candidates: GridCandidate[] = []

      for (let y = 0; y < config.height; y += 1) {
        for (let x = 0; x < config.width; x += 1) {
          if (forbidden.has(cellKey(x, y)) || (!usedXs.has(x) && !usedYs.has(y))) continue
          const candidate = { x, y }
          if (requirePlanarVisibility && !canAddWithoutVisibilityCrossings(cells, candidate)) {
            continue
          }
          candidates.push({
            ...candidate,
            newlyForbiddenCells: countNewlyForbiddenCells(candidate, forbidden, config),
          })
        }
      }

      if (candidates.length === 0) break
      const fewestNewlyForbidden = Math.min(
        ...candidates.map(({ newlyForbiddenCells }) => newlyForbiddenCells),
      )
      const leastBlocking = candidates.filter(
        ({ newlyForbiddenCells }) => newlyForbiddenCells === fewestNewlyForbidden,
      )
      const lineExpanding = leastBlocking.filter(({ x, y }) => !usedXs.has(x) || !usedYs.has(y))
      const pool = lineExpanding.length > 0 ? lineExpanding : leastBlocking
      const selected = pool[randomIndex(pool.length, random)]!
      cells.push(selected)
      forbidNeighboringCells(selected, forbidden, config)
    }

    const islands = cells
      .sort((left, right) => left.y - right.y || left.x - right.x)
      .map(({ x, y }, index) => ({ id: `i${index}`, x, y, clue: 0 }))

    if (isValidIslandPlacement(islands, config, requirePlanarVisibility)) return islands
  }

  return []
}

function cellKey(x: number, y: number) {
  return `${x},${y}`
}

function forbidNeighboringCells(cell: GridCell, forbidden: Set<string>, config: CategoryConfig) {
  for (let y = Math.max(0, cell.y - 1); y <= Math.min(config.height - 1, cell.y + 1); y += 1) {
    for (let x = Math.max(0, cell.x - 1); x <= Math.min(config.width - 1, cell.x + 1); x += 1) {
      forbidden.add(cellKey(x, y))
    }
  }
}

function countNewlyForbiddenCells(cell: GridCell, forbidden: Set<string>, config: CategoryConfig) {
  let count = 0
  for (let y = Math.max(0, cell.y - 1); y <= Math.min(config.height - 1, cell.y + 1); y += 1) {
    for (let x = Math.max(0, cell.x - 1); x <= Math.min(config.width - 1, cell.x + 1); x += 1) {
      if (!forbidden.has(cellKey(x, y))) count += 1
    }
  }
  return count
}

function canAddWithoutVisibilityCrossings(cells: GridCell[], candidate: GridCell) {
  const islands = [...cells, candidate].map(({ x, y }, index) => ({
    id: `i${index}`,
    x,
    y,
    clue: 0,
  }))
  const candidateId = islands.at(-1)!.id
  const islandById = new Map(islands.map((island) => [island.id, island]))
  const corridors = getVisibleCorridors(islands)
  const addedCorridors = corridors.filter(
    (corridor) => corridor.a === candidateId || corridor.b === candidateId,
  )

  return addedCorridors.every((added) =>
    corridors.every(
      (other) =>
        added === other ||
        !corridorsCross(
          { a: islandById.get(added.a)!, b: islandById.get(added.b)! },
          { a: islandById.get(other.a)!, b: islandById.get(other.b)! },
        ),
    ),
  )
}

export function hasMinimumIslandSpacing(islands: Island[]) {
  return islands.every((island, index) =>
    islands
      .slice(index + 1)
      .every((other) => Math.abs(island.x - other.x) > 1 || Math.abs(island.y - other.y) > 1),
  )
}

function isValidIslandPlacement(
  islands: Island[],
  config: CategoryConfig,
  requirePlanarVisibility: boolean,
) {
  if (islands.length !== config.targetIslands || !hasMinimumIslandSpacing(islands)) return false
  if (requirePlanarVisibility && countCorridorCrossings(islands) !== 0) return false

  const xs = islands.map(({ x }) => x)
  const ys = islands.map(({ y }) => y)
  if (
    Math.min(...xs) !== 0 ||
    Math.max(...xs) !== config.width - 1 ||
    Math.min(...ys) !== 0 ||
    Math.max(...ys) !== config.height - 1
  ) {
    return false
  }

  if (!hasNoLargeEmptyBands(xs, config.width) || !hasNoLargeEmptyBands(ys, config.height)) {
    return false
  }
  if (!hasConsecutiveCoordinateLines(xs) || !hasConsecutiveCoordinateLines(ys)) return false

  return hasConnectedVisibilityGraph(islands)
}

function hasConsecutiveCoordinateLines(coordinates: number[]) {
  const occupied = [...new Set(coordinates)].sort((left, right) => left - right)
  return occupied.slice(1).some((coordinate, index) => coordinate - occupied[index]! === 1)
}

function hasNoLargeEmptyBands(coordinates: number[], size: number) {
  const occupied = [...new Set(coordinates)].sort((left, right) => left - right)
  return (
    occupied[0] === 0 &&
    occupied.at(-1) === size - 1 &&
    occupied.slice(1).every((coordinate, index) => coordinate - occupied[index]! <= 3)
  )
}

function hasConnectedVisibilityGraph(islands: Island[]) {
  if (islands.length === 0) return false

  const corridors = getVisibleCorridors(islands)
  const neighbors = new Map(islands.map(({ id }) => [id, [] as string[]]))
  for (const corridor of corridors) {
    neighbors.get(corridor.a)!.push(corridor.b)
    neighbors.get(corridor.b)!.push(corridor.a)
  }
  const visited = new Set<string>()
  const stack = [islands[0]!.id]

  while (stack.length > 0) {
    const islandId = stack.pop()!
    if (visited.has(islandId)) continue
    visited.add(islandId)
    for (const neighbor of neighbors.get(islandId)!)
      if (!visited.has(neighbor)) stack.push(neighbor)
  }

  return visited.size === islands.length
}

function buildBalancedPlanarSolution(
  islands: Island[],
  corridors: Corridor[],
  config: CategoryConfig,
  random: Random,
): BridgeCounts | undefined {
  const islandById = new Map(islands.map((island) => [island.id, island]))

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const active = buildPlanarSpanningTree(islands, corridors, islandById, random)
    if (!active) continue

    const selectedIds = new Set(active.map(({ id }) => id))
    for (const corridor of shuffled(corridors, random)) {
      if (active.length - islands.length + 1 >= config.targetCycleEdges) break
      if (selectedIds.has(corridor.id) || crossesAny(corridor, active, islandById)) continue

      active.push(corridor)
      selectedIds.add(corridor.id)
    }
    if (active.length - islands.length + 1 < config.targetCycleEdges) continue

    const activeCounts = assignBalancedBridgeCounts(
      islands,
      active,
      random,
      config.targetCycleEdges > 0,
    )

    return Object.fromEntries(
      corridors.map(({ id }) => [id, selectedIds.has(id) ? activeCounts[id] : 0]),
    ) as BridgeCounts
  }

  return undefined
}

function assignBalancedBridgeCounts(
  islands: Island[],
  active: Corridor[],
  random: Random,
  includeHighClues: boolean,
) {
  const counts = Object.fromEntries(active.map(({ id }) => [id, 1])) as BridgeCounts
  const totals = new Map(islands.map(({ id }) => [id, 0]))
  for (const corridor of active) {
    totals.set(corridor.a, totals.get(corridor.a)! + 1)
    totals.set(corridor.b, totals.get(corridor.b)! + 1)
  }

  const targetShares = [0, 0.12, 0.24, 0.28, 0.18, 0.09, 0.05, 0.03, 0.01]
  const histogram = () => {
    const result = Array<number>(9).fill(0)
    for (const total of totals.values()) result[total]! += 1
    return result
  }
  const targetCounts = targetShares.map((share) => share * islands.length)
  const doubled = new Set<string>()
  const doubleTarget = Math.round(active.length * DOUBLE_BRIDGE_SHARE)

  while (doubled.size < doubleTarget) {
    const currentHistogram = histogram()
    const candidates = active
      .filter(
        (corridor) =>
          !doubled.has(corridor.id) && totals.get(corridor.a)! < 8 && totals.get(corridor.b)! < 8,
      )
      .map((corridor) => {
        const nextHistogram = [...currentHistogram]
        for (const islandId of [corridor.a, corridor.b]) {
          const total = totals.get(islandId)!
          nextHistogram[total]! -= 1
          nextHistogram[total + 1]! += 1
        }
        const penalty = nextHistogram.reduce(
          (sum, value, clue) => sum + (value - targetCounts[clue]!) ** 2,
          0,
        )
        return { corridor, penalty, tieBreak: random() }
      })
      .sort((left, right) => left.penalty - right.penalty || left.tieBreak - right.tieBreak)

    const selected = candidates[0]?.corridor
    if (!selected) break
    doubled.add(selected.id)
    counts[selected.id] = 2
    totals.set(selected.a, totals.get(selected.a)! + 1)
    totals.set(selected.b, totals.get(selected.b)! + 1)
  }

  const promoteOneIsland = (target: number) => {
    const candidateIslands = shuffled(
      islands.filter(({ id }) => totals.get(id) === target - 1),
      random,
    )
    for (const candidate of candidateIslands) {
      const edge = shuffled(
        active.filter(
          (corridor) =>
            !doubled.has(corridor.id) &&
            (corridor.a === candidate.id || corridor.b === candidate.id),
        ),
        random,
      ).find((corridor) => {
        const neighbor = corridor.a === candidate.id ? corridor.b : corridor.a
        return totals.get(neighbor)! < 8
      })
      if (!edge) continue

      doubled.add(edge.id)
      counts[edge.id] = 2
      totals.set(edge.a, totals.get(edge.a)! + 1)
      totals.set(edge.b, totals.get(edge.b)! + 1)
      return true
    }
    return false
  }

  if (includeHighClues) {
    if (![...totals.values()].includes(7)) promoteOneIsland(7)
    const minimumHighClues = Math.ceil(islands.length * 0.04)
    while (
      [...totals.values()].filter((total) => total === 6 || total === 7).length < minimumHighClues
    ) {
      if (!promoteOneIsland(6)) break
    }
  }

  return counts
}

function buildPlanarSpanningTree(
  islands: Island[],
  corridors: Corridor[],
  islandById: Map<string, Island>,
  random: Random,
) {
  const visited = new Set([islands[randomIndex(islands.length, random)]!.id])
  const tree: Corridor[] = []

  while (visited.size < islands.length) {
    const candidates = corridors.filter(
      (corridor) =>
        visited.has(corridor.a) !== visited.has(corridor.b) &&
        !crossesAny(corridor, tree, islandById),
    )
    if (candidates.length === 0) return undefined

    const corridor = candidates[randomIndex(candidates.length, random)]!
    tree.push(corridor)
    visited.add(visited.has(corridor.a) ? corridor.b : corridor.a)
  }

  return tree
}

function crossesAny(candidate: Corridor, selected: Corridor[], islandById: Map<string, Island>) {
  return selected.some((active) =>
    corridorsCross(
      { a: islandById.get(candidate.a)!, b: islandById.get(candidate.b)! },
      { a: islandById.get(active.a)!, b: islandById.get(active.b)! },
    ),
  )
}

function hasCategoryShape(
  puzzle: HashiPuzzle,
  solution: BridgeCounts,
  corridors: Corridor[],
  config: CategoryConfig,
) {
  const histogram = new Map<number, number>()
  for (const { clue } of puzzle.islands) histogram.set(clue, (histogram.get(clue) ?? 0) + 1)

  const activeCounts = Object.values(solution).filter((count) => count > 0)
  const doubleShare = activeCounts.filter((count) => count === 2).length / activeCounts.length
  const highClueShare = ((histogram.get(6) ?? 0) + (histogram.get(7) ?? 0)) / puzzle.islands.length
  const eightShare = (histogram.get(8) ?? 0) / puzzle.islands.length

  if (config.targetCycleEdges === 0) {
    if ([...histogram.keys()].some((clue) => clue > 5)) return false
    for (let clue = 1; clue <= 4; clue += 1) if (!(histogram.get(clue) ?? 0)) return false
    return doubleShare <= 0.3
  }

  if (doubleShare < 0.15 || doubleShare > 0.3) return false
  if (countOpeningDeductions(puzzle) < config.minimumOpeningDeductions) return false
  if (highClueShare < 0.04 || highClueShare > 0.25 || eightShare > 0.03) return false
  for (let clue = 1; clue <= 7; clue += 1) if (!(histogram.get(clue) ?? 0)) return false
  for (let clue = 1; clue <= 5; clue += 1) {
    if ((histogram.get(clue) ?? 0) / puzzle.islands.length < 0.04) return false
  }

  return countCorridorCrossings(puzzle.islands, corridors) >= config.minimumCrossingPairs
}

/**
 * Counts islands that expose a bridge immediately through the standard capacity rules:
 * a lone neighbor or a clue close enough to the available capacity to force one edge.
 */
export function countOpeningDeductions(puzzle: HashiPuzzle) {
  const islandById = new Map(puzzle.islands.map((island) => [island.id, island]))
  const incident = new Map(puzzle.islands.map((island) => [island.id, [] as Corridor[]]))
  for (const corridor of getVisibleCorridors(puzzle.islands)) {
    incident.get(corridor.a)!.push(corridor)
    incident.get(corridor.b)!.push(corridor)
  }

  return puzzle.islands.filter((island) => {
    const corridors = incident.get(island.id)!
    const edgeCapacities = corridors.map((corridor) => {
      const neighborId = corridor.a === island.id ? corridor.b : corridor.a
      return Math.min(2, island.clue, islandById.get(neighborId)!.clue)
    })
    const capacity = edgeCapacities.reduce((total, edgeCapacity) => total + edgeCapacity, 0)

    return (
      island.clue <= capacity &&
      edgeCapacities.some((edgeCapacity) => island.clue - (capacity - edgeCapacity) > 0)
    )
  }).length
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

  return `hashi-${HASHI_GENERATOR_VERSION}-${puzzle.category}-${(hash >>> 0).toString(16).padStart(8, '0')}`
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
