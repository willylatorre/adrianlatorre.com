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

export const HASHI_GENERATOR_VERSION = 'v6'
const DEFAULT_GENERATION_TIME_BUDGET_MS = 3_000
const DOUBLE_BRIDGE_SHARE = 0.22
const FALLBACK_SEED = 123_456
const COVERAGE_RADIUS = 4

export function generatePuzzle(
  category: HashiCategory,
  seed: number,
  options: PuzzleGenerationOptions = {},
): GeneratedPuzzle {
  const random = mulberry32(seed)
  const now = options.now ?? Date.now
  const generationDeadline = now() + (options.timeBudgetMs ?? DEFAULT_GENERATION_TIME_BUDGET_MS)
  const generated = tryGeneratePuzzle(category, random, () => now() >= generationDeadline)

  return generated ?? generateFallbackPuzzle(category)
}

/** Builds a deterministic, full-size puzzle when the normal time budget is exhausted. */
export function generateFallbackPuzzle(category: HashiCategory): GeneratedPuzzle {
  const generated = tryGeneratePuzzle(category, mulberry32(FALLBACK_SEED), () => false)
  if (!generated) throw new Error(`Unable to build the ${category} Hashi fallback`)
  return generated
}

function tryGeneratePuzzle(
  category: HashiCategory,
  random: Random,
  shouldStop: () => boolean,
): GeneratedPuzzle | undefined {
  const config = CATEGORY_CONFIG[category]
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (shouldStop()) break

    const placement = placeOrganicIslands(config, random, category === 'intro')
    if (!placement) continue
    const { islands, planarNetworkIds } = placement
    const corridors = getVisibleCorridors(islands)
    const initialSolution = buildBalancedPlanarSolution(
      islands,
      corridors,
      config,
      random,
      planarNetworkIds,
    )
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
  boundaryGain: number
  coverageGain: number
  coordinateGain: number
  lineUse: number
  meshGain: number
  newlyForbiddenCells: number
  replacedEdges: GridEdge[]
  parents: GridCell[]
  tieBreak: number
}

interface GridEdge {
  a: GridCell
  b: GridCell
}

interface IslandPlacement {
  islands: Island[]
  planarNetworkIds: Set<string>
}

function placeOrganicIslands(
  config: CategoryConfig,
  random: Random,
  requirePlanarVisibility = false,
): IslandPlacement | undefined {
  const cells: GridCell[] = [
    {
      x: 2 + randomIndex(config.width - 4, random),
      y: 2 + randomIndex(config.height - 4, random),
    },
  ]
  const planarEdges: GridEdge[] = []
  const forbidden = new Set<string>()
  for (const cell of cells) forbidNeighboringCells(cell, forbidden, config)

  while (cells.length < config.targetIslands) {
    const xUses = countCoordinateUses(cells, 'x')
    const yUses = countCoordinateUses(cells, 'y')
    const cellsByX = groupCellsByCoordinate(cells, 'x')
    const cellsByY = groupCellsByCoordinate(cells, 'y')
    const covered = collectCoveredCells(cells, config, COVERAGE_RADIUS)
    const openBoundaries = findOpenBoundaries(cells, config)
    const candidates: GridCandidate[] = []

    for (let y = 0; y < config.height; y += 1) {
      for (let x = 0; x < config.width; x += 1) {
        if (forbidden.has(cellKey(x, y)) || (!xUses.has(x) && !yUses.has(y))) continue
        const candidate = { x, y }
        if (requirePlanarVisibility && !canAddWithoutVisibilityCrossings(cells, candidate)) {
          continue
        }
        const replacedEdges = planarEdges.filter((edge) => cellBlocksEdge(candidate, edge))
        const remainingEdges = planarEdges.filter((edge) => !replacedEdges.includes(edge))
        const parents = getVisibleGridNeighbors(
          cellsByY.get(y) ?? [],
          cellsByX.get(x) ?? [],
          candidate,
        ).filter((parent) =>
          remainingEdges.every((edge) => !gridEdgesCross({ a: candidate, b: parent }, edge)),
        )
        if (parents.length === 0) continue
        candidates.push({
          ...candidate,
          boundaryGain: countNewBoundaries(candidate, openBoundaries, config),
          coverageGain: countNewlyCoveredCells(candidate, covered, config, COVERAGE_RADIUS),
          coordinateGain:
            Number(xUses.size < Math.ceil(config.width * 0.75) && !xUses.has(x)) +
            Number(yUses.size < Math.ceil(config.height * 0.75) && !yUses.has(y)),
          lineUse: (xUses.get(x) ?? 0) + (yUses.get(y) ?? 0),
          meshGain: parents.length - replacedEdges.length - 1,
          newlyForbiddenCells: countNewlyForbiddenCells(candidate, forbidden, config),
          replacedEdges,
          parents,
          tieBreak: random(),
        })
      }
    }

    if (candidates.length === 0) break
    const selected = candidates.sort(
      (left, right) => candidateScore(right) - candidateScore(left),
    )[0]!
    cells.push(selected)
    for (const replaced of selected.replacedEdges) {
      planarEdges.splice(planarEdges.indexOf(replaced), 1)
    }
    for (const parent of selected.parents) planarEdges.push({ a: selected, b: parent })
    forbidNeighboringCells(selected, forbidden, config)
  }

  const islands = cells
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map(({ x, y }, index) => ({ id: `i${index}`, x, y, clue: 0 }))

  if (
    !isValidIslandPlacement(islands, config, requirePlanarVisibility) ||
    planarEdges.length - islands.length + 1 < config.targetCycleEdges
  ) {
    return undefined
  }

  const islandIdByCell = new Map(islands.map((island) => [cellKey(island.x, island.y), island.id]))
  const corridorByPair = new Map(
    getVisibleCorridors(islands).map((corridor) => [
      [corridor.a, corridor.b].sort().join('|'),
      corridor.id,
    ]),
  )
  const planarNetworkIds = new Set<string>()
  for (const edge of planarEdges) {
    const a = islandIdByCell.get(cellKey(edge.a.x, edge.a.y))!
    const b = islandIdByCell.get(cellKey(edge.b.x, edge.b.y))!
    const corridorId = corridorByPair.get([a, b].sort().join('|'))
    if (!corridorId) break
    planarNetworkIds.add(corridorId)
  }
  if (planarNetworkIds.size === planarEdges.length) return { islands, planarNetworkIds }

  return undefined
}

function getVisibleGridNeighbors(
  horizontal: GridCell[],
  vertical: GridCell[],
  candidate: GridCell,
) {
  return [
    horizontal.filter(({ x }) => x < candidate.x).at(-1),
    horizontal.find(({ x }) => x > candidate.x),
    vertical.filter(({ y }) => y < candidate.y).at(-1),
    vertical.find(({ y }) => y > candidate.y),
  ].filter((cell): cell is GridCell => cell !== undefined)
}

function groupCellsByCoordinate(cells: GridCell[], axis: 'x' | 'y') {
  const grouped = new Map<number, GridCell[]>()
  const otherAxis = axis === 'x' ? 'y' : 'x'
  for (const cell of cells) {
    const group = grouped.get(cell[axis]) ?? []
    group.push(cell)
    grouped.set(cell[axis], group)
  }
  for (const group of grouped.values())
    group.sort((left, right) => left[otherAxis] - right[otherAxis])
  return grouped
}

function cellBlocksEdge(cell: GridCell, edge: GridEdge) {
  if (edge.a.y === edge.b.y) {
    return cell.y === edge.a.y && isStrictlyBetween(cell.x, edge.a.x, edge.b.x)
  }
  return cell.x === edge.a.x && isStrictlyBetween(cell.y, edge.a.y, edge.b.y)
}

function gridEdgesCross(first: GridEdge, second: GridEdge) {
  const firstHorizontal = first.a.y === first.b.y
  const secondHorizontal = second.a.y === second.b.y
  if (firstHorizontal === secondHorizontal) return false

  const horizontal = firstHorizontal ? first : second
  const vertical = firstHorizontal ? second : first
  return (
    isStrictlyBetween(vertical.a.x, horizontal.a.x, horizontal.b.x) &&
    isStrictlyBetween(horizontal.a.y, vertical.a.y, vertical.b.y)
  )
}

function isStrictlyBetween(value: number, first: number, second: number) {
  return value > Math.min(first, second) && value < Math.max(first, second)
}

function candidateScore(candidate: GridCandidate) {
  return (
    candidate.boundaryGain * 100_000 +
    candidate.coverageGain * 100 +
    candidate.coordinateGain * 250 -
    candidate.lineUse * 30 -
    candidate.newlyForbiddenCells * 5 +
    candidate.meshGain * 220 +
    candidate.tieBreak * 80
  )
}

function countCoordinateUses(cells: GridCell[], axis: 'x' | 'y') {
  const uses = new Map<number, number>()
  for (const cell of cells) uses.set(cell[axis], (uses.get(cell[axis]) ?? 0) + 1)
  return uses
}

interface OpenBoundaries {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

function findOpenBoundaries(cells: GridCell[], config: CategoryConfig): OpenBoundaries {
  return {
    top: !cells.some(({ y }) => y === 0),
    right: !cells.some(({ x }) => x === config.width - 1),
    bottom: !cells.some(({ y }) => y === config.height - 1),
    left: !cells.some(({ x }) => x === 0),
  }
}

function countNewBoundaries(
  candidate: GridCell,
  openBoundaries: OpenBoundaries,
  config: CategoryConfig,
) {
  return (
    Number(openBoundaries.top && candidate.y === 0) +
    Number(openBoundaries.right && candidate.x === config.width - 1) +
    Number(openBoundaries.bottom && candidate.y === config.height - 1) +
    Number(openBoundaries.left && candidate.x === 0)
  )
}

function collectCoveredCells(cells: GridCell[], config: CategoryConfig, maximumDistance: number) {
  const covered = new Set<string>()
  for (const cell of cells) {
    for (
      let y = Math.max(0, cell.y - maximumDistance);
      y <= Math.min(config.height - 1, cell.y + maximumDistance);
      y += 1
    ) {
      for (
        let x = Math.max(0, cell.x - maximumDistance);
        x <= Math.min(config.width - 1, cell.x + maximumDistance);
        x += 1
      ) {
        covered.add(cellKey(x, y))
      }
    }
  }
  return covered
}

function countNewlyCoveredCells(
  cell: GridCell,
  covered: Set<string>,
  config: CategoryConfig,
  maximumDistance: number,
) {
  let count = 0
  for (
    let y = Math.max(0, cell.y - maximumDistance);
    y <= Math.min(config.height - 1, cell.y + maximumDistance);
    y += 1
  ) {
    for (
      let x = Math.max(0, cell.x - maximumDistance);
      x <= Math.min(config.width - 1, cell.x + maximumDistance);
      x += 1
    ) {
      if (!covered.has(cellKey(x, y))) count += 1
    }
  }
  return count
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

export function hasBroadCoordinateUse(
  islands: Island[],
  width: number,
  height: number,
  minimumShare = 0.75,
) {
  const occupiedXs = new Set(islands.map(({ x }) => x)).size
  const occupiedYs = new Set(islands.map(({ y }) => y)).size

  return occupiedXs / width >= minimumShare && occupiedYs / height >= minimumShare
}

export function hasLocalIslandCoverage(
  islands: Island[],
  width: number,
  height: number,
  maximumDistance = 4,
) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const covered = islands.some(
        (island) => Math.max(Math.abs(island.x - x), Math.abs(island.y - y)) <= maximumDistance,
      )
      if (!covered) return false
    }
  }

  return true
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
  if (!hasBroadCoordinateUse(islands, config.width, config.height)) return false
  if (!hasLocalIslandCoverage(islands, config.width, config.height, COVERAGE_RADIUS)) return false

  return hasConnectedVisibilityGraph(islands)
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
  planarNetworkIds: Set<string>,
): BridgeCounts | undefined {
  const islandById = new Map(islands.map((island) => [island.id, island]))
  const guaranteedNetwork = corridors.filter(({ id }) => planarNetworkIds.has(id))
  if (guaranteedNetwork.length - islands.length + 1 < config.targetCycleEdges) return undefined

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const active = buildPlanarSpanningTree(islands, guaranteedNetwork, islandById, random)
    if (!active) continue

    const selectedIds = new Set(active.map(({ id }) => id))
    const cycleCandidates = [
      ...shuffled(guaranteedNetwork, random),
      ...shuffled(
        corridors.filter(({ id }) => !planarNetworkIds.has(id)),
        random,
      ),
    ]
    for (const corridor of cycleCandidates) {
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
