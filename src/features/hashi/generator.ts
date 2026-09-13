import { assessDifficulty } from './difficulty'
import fallbackPuzzles from './fallback-puzzles.json'
import { findSolutions } from './solver'
import { evaluatePuzzle } from './rules'
import { corridorsCross, countCorridorCrossings, getVisibleCorridors } from './geometry'
import type { BridgeCounts, Corridor, HashiCategory, HashiPuzzle, Island } from './types'

export const CATEGORY_CONFIG = {
  intro: {
    difficulty: 'easy',
    width: 10,
    height: 10,
    targetIslands: 30,
    targetCycleEdges: 0,
    minimumCrossingPairs: 0,
    minimumOpeningDeductions: 1,
  },
  daily: {
    difficulty: 'medium',
    width: 20,
    height: 20,
    targetIslands: 120,
    targetCycleEdges: 13,
    minimumCrossingPairs: 4,
    minimumOpeningDeductions: 5,
  },
  weekly: {
    difficulty: 'hard',
    width: 25,
    height: 25,
    targetIslands: 190,
    targetCycleEdges: 22,
    minimumCrossingPairs: 8,
    minimumOpeningDeductions: 8,
  },
  monthly: {
    difficulty: 'hard',
    width: 30,
    height: 30,
    targetIslands: 280,
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

export const HASHI_GENERATOR_VERSION = 'v7'
const DEFAULT_GENERATION_TIME_BUDGET_MS = 3_000
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

  return generated ?? generateFallbackPuzzle(category, seed)
}

/** Already validated offline: deadline exhaustion never starts another search. */
export function generateFallbackPuzzle(category: HashiCategory, seed = 0): GeneratedPuzzle {
  // JSON widens clue/count literals; the fixture suite validates every entry.
  const pool = fallbackPuzzles[category] as unknown as GeneratedPuzzle[]
  return structuredClone(pool[(seed >>> 0) % pool.length]!)
}

function tryGeneratePuzzle(
  category: HashiCategory,
  random: Random,
  shouldStop: () => boolean,
): GeneratedPuzzle | undefined {
  const config = CATEGORY_CONFIG[category]
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (shouldStop()) break

    const placement = placeOrganicIslands(config, random, shouldStop)
    if (!placement) continue
    const { islands, planarNetworkIds } = placement
    const corridors = getVisibleCorridors(islands)
    const initialSolution = buildPlanarSolution(
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
    const unique = makeUnique(initialPuzzle, initialSolution, corridors, random, shouldStop)
    if (unique && hasCategoryShape(unique.puzzle, unique.solution, corridors, config)) {
      const assessment = assessDifficulty(unique.puzzle, shouldStop)
      if (!assessment.solved || assessment.difficulty !== config.difficulty) continue
      return {
        puzzle: { ...unique.puzzle, id: fingerprintPuzzle(unique.puzzle) },
        solution: unique.solution,
      }
    }
  }
}

/** Change clues through valid networks, never add givens or silently accept ambiguity. */
function makeUnique(
  initialPuzzle: HashiPuzzle,
  initialSolution: BridgeCounts,
  corridors: Corridor[],
  random: Random,
  shouldStop: () => boolean,
): GeneratedPuzzle | undefined {
  let puzzle = initialPuzzle
  const solution = { ...initialSolution }
  for (let repair = 0; repair <= corridors.length; repair++) {
    if (shouldStop()) return undefined
    const result = findSolutions(
      puzzle,
      2,
      {
        deadline: 1,
        nodeLimit: 2000,
        now: () => (shouldStop() ? 1 : 0),
      },
      solution,
    )
    if (result.timedOut || !result.solutions.length) return undefined
    if (result.solutions.length === 1) return { puzzle, solution }
    const alternative = result.solutions.find((candidate) =>
      corridors.some((e) => candidate[e.id] !== solution[e.id]),
    )!
    const choices = shuffled(
      corridors.filter((e) => solution[e.id] === 1 && alternative[e.id] !== 1),
      random,
    )
    let repaired = false
    for (const edge of choices) {
      // Push a differing single to a bound, breaking the ambiguous cycle.
      solution[edge.id] = alternative[edge.id] === 2 ? 2 : 0
      const next = deriveClues(puzzle, corridors, solution)
      if (evaluatePuzzle(next, solution).solved) {
        puzzle = next
        repaired = true
        break
      }
      solution[edge.id] = 1
    }
    if (!repaired) return undefined
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
  replacedEdges: GridEdge[]
  parents: GridCell[]
  priority: number
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
  shouldStop: () => boolean,
): IslandPlacement | undefined {
  const cells: GridCell[] = [
    {
      x: 2 + randomIndex(config.width - 4, random),
      y: 2 + randomIndex(config.height - 4, random),
    },
  ]
  const planarEdges: GridEdge[] = []
  const forbidden = new Set<string>()
  for (const cell of cells) forbidNeighboringCells(cell, forbidden)

  while (cells.length < config.targetIslands) {
    if (shouldStop()) return undefined
    const xUses = countCoordinateUses(cells, 'x')
    const yUses = countCoordinateUses(cells, 'y')
    const cellsByX = groupCellsByCoordinate(cells, 'x')
    const cellsByY = groupCellsByCoordinate(cells, 'y')
    const openBoundaries = findOpenBoundaries(cells, config)
    const candidates: GridCandidate[] = []

    for (let y = 0; y < config.height; y += 1) {
      for (let x = 0; x < config.width; x += 1) {
        if (forbidden.has(cellKey(x, y)) || (!xUses.has(x) && !yUses.has(y))) continue
        const candidate = { x, y }
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
        // Weighted random growth: empty lines and short/medium bridges are useful,
        // but no deterministic coverage or rectangle score chooses the next island.
        const distance = Math.min(...parents.map((p) => Math.abs(p.x - x) + Math.abs(p.y - y)))
        const newLine = Number(!xUses.has(x)) + Number(!yUses.has(y))
        const boundary = countNewBoundaries(candidate, openBoundaries, config)
        const weight = (1 + newLine * 2 + boundary * 3) / Math.sqrt(distance)
        candidates.push({
          ...candidate,
          replacedEdges,
          parents,
          priority: -Math.log(Math.max(random(), Number.EPSILON)) / weight,
        })
      }
    }

    if (candidates.length === 0) break
    const selected = candidates.sort((left, right) => left.priority - right.priority)[0]!
    cells.push(selected)
    for (const replaced of selected.replacedEdges) {
      planarEdges.splice(planarEdges.indexOf(replaced), 1)
    }
    const requiredParents = selected.replacedEdges.flatMap((edge) => [edge.a, edge.b])
    const parents = requiredParents.length
      ? requiredParents
      : [selected.parents[randomIndex(selected.parents.length, random)]!]
    for (const parent of parents) planarEdges.push({ a: selected, b: parent })
    forbidNeighboringCells(selected, forbidden)
  }

  // Add available noncrossing connections after growth, so early rectangles do
  // not cage off the empty cells needed by later islands.
  const byX = groupCellsByCoordinate(cells, 'x')
  const byY = groupCellsByCoordinate(cells, 'y')
  const extras: GridEdge[] = []
  for (const cell of cells) {
    for (const parent of getVisibleGridNeighbors(byY.get(cell.y)!, byX.get(cell.x)!, cell)) {
      if (parent.x < cell.x || parent.y < cell.y) continue
      if (
        !planarEdges.some(
          (e) => (e.a === cell && e.b === parent) || (e.a === parent && e.b === cell),
        )
      )
        extras.push({ a: cell, b: parent })
    }
  }
  for (const edge of shuffled(extras, random)) {
    if (planarEdges.every((other) => !gridEdgesCross(edge, other))) planarEdges.push(edge)
  }

  const islands = cells
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map(({ x, y }, index) => ({ id: `i${index}`, x, y, clue: 0 }))

  if (
    !isValidIslandPlacement(islands, config) ||
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

function cellKey(x: number, y: number) {
  return `${x},${y}`
}

function forbidNeighboringCells(cell: GridCell, forbidden: Set<string>) {
  // Diagonal islands are essential to staggered layouts. Only touching islands
  // on the same row/column would leave no room to draw a bridge.
  for (const [dx, dy] of [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    forbidden.add(cellKey(cell.x + dx!, cell.y + dy!))
  }
}

export function hasMinimumIslandSpacing(islands: Island[]) {
  return islands.every((island, index) =>
    islands
      .slice(index + 1)
      .every((other) => Math.abs(island.x - other.x) + Math.abs(island.y - other.y) > 1),
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

function isValidIslandPlacement(islands: Island[], config: CategoryConfig) {
  if (islands.length !== config.targetIslands || !hasMinimumIslandSpacing(islands)) return false

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

function buildPlanarSolution(
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

    const activeCounts = assignBridgeCounts(active, random, config.targetCycleEdges > 0)

    return Object.fromEntries(
      corridors.map(({ id }) => [id, selectedIds.has(id) ? activeCounts[id] : 0]),
    ) as BridgeCounts
  }

  return undefined
}

function assignBridgeCounts(active: Corridor[], random: Random, includeHighClues: boolean) {
  return Object.fromEntries(
    active.map((edge) => [edge.id, random() < (includeHighClues ? 0.45 : 0.2) ? 2 : 1]),
  ) as BridgeCounts
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
  const clues = puzzle.islands.map((i) => i.clue)
  if (clues.some((clue) => clue < 1 || clue > 8)) return false
  if (countOpeningDeductions(puzzle) < config.minimumOpeningDeductions) return false
  if (puzzle.category === 'intro') return Math.max(...clues) <= 5
  const active = Object.values(solution).filter((count) => count > 0)
  return (
    new Set(clues).size >= 6 &&
    active.length >= puzzle.islands.length &&
    countCorridorCrossings(puzzle.islands, corridors) >= config.minimumCrossingPairs
  )
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
