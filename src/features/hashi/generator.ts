import { cloneFallback } from './fallbacks'
import { corridorsCross, getVisibleCorridors } from './geometry'
import { countSolutionsWithDeadline } from './solver'
import type { BridgeCounts, Corridor, HashiCategory, HashiPuzzle, Island } from './types'

export const CATEGORY_CONFIG = {
  intro: { width: 15, height: 15, targetIslands: 32, optionalGroupRate: 0.08, loneDoubleRate: 0.12 },
  daily: { width: 30, height: 15, targetIslands: 72, optionalGroupRate: 0.18, loneDoubleRate: 0.22 },
  weekly: { width: 35, height: 18, targetIslands: 108, optionalGroupRate: 0.24, loneDoubleRate: 0.28 },
  monthly: { width: 40, height: 20, targetIslands: 150, optionalGroupRate: 0.3, loneDoubleRate: 0.34 },
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

export const HASHI_GENERATOR_VERSION = 'v2'
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

    const islands = placeSeparatedIslands(config, random)
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

interface LatticeCell {
  column: number
  row: number
  x: number
  y: number
}

function placeSeparatedIslands(config: CategoryConfig, random: Random): Island[] {
  const xs = chooseSeparatedCoordinates(config.width, random)
  const ys = chooseSeparatedCoordinates(config.height, random)
  let cells = xs.flatMap((x, column) =>
    ys.map((y, row) => ({ column, row, x, y } satisfies LatticeCell)),
  )

  while (cells.length > config.targetIslands) {
    let removed = false

    for (const candidate of shuffled(cells, random)) {
      if (cells.length <= config.targetIslands) break
      const remaining = cells.filter((cell) => cell !== candidate)
      if (!usesEveryLatticeLine(remaining, xs.length, ys.length)) continue
      if (!isLatticeConnected(remaining)) continue
      if (!hasPlanarVisibilityGraph(remaining)) continue

      cells = remaining
      removed = true
    }

    if (!removed) return []
  }

  const islands = cells
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map(({ x, y }, index) => ({ id: `i${index}`, x, y, clue: 0 }))

  return hasMinimumIslandSpacing(islands) ? islands : []
}

function hasPlanarVisibilityGraph(cells: LatticeCell[]) {
  const islands = cells.map(({ x, y }, index) => ({ id: `i${index}`, x, y, clue: 0 }))
  const islandById = new Map(islands.map((island) => [island.id, island]))
  const corridors = getVisibleCorridors(islands)

  return corridors.every((first, index) =>
    corridors.slice(index + 1).every(
      (second) =>
        !corridorsCross(
          { a: islandById.get(first.a)!, b: islandById.get(first.b)! },
          { a: islandById.get(second.a)!, b: islandById.get(second.b)! },
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

function usesEveryLatticeLine(cells: LatticeCell[], columnCount: number, rowCount: number) {
  const columns = new Set(cells.map(({ column }) => column))
  const rows = new Set(cells.map(({ row }) => row))
  return columns.size === columnCount && rows.size === rowCount
}

function isLatticeConnected(cells: LatticeCell[]) {
  if (cells.length === 0) return false

  const occupied = new Set(cells.map(({ column, row }) => `${column},${row}`))
  const visited = new Set<string>()
  const stack: Array<[number, number]> = [[cells[0]!.column, cells[0]!.row]]

  while (stack.length > 0) {
    const [column, row] = stack.pop()!
    const key = `${column},${row}`
    if (visited.has(key)) continue
    visited.add(key)

    for (const [neighborColumn, neighborRow] of [
      [column - 1, row],
      [column + 1, row],
      [column, row - 1],
      [column, row + 1],
    ] as Array<[number, number]>) {
      const neighborKey = `${neighborColumn},${neighborRow}`
      if (occupied.has(neighborKey) && !visited.has(neighborKey)) {
        stack.push([neighborColumn, neighborRow])
      }
    }
  }

  return visited.size === cells.length
}

function buildConnectedPlanarSolution(
  islands: Island[],
  corridors: Corridor[],
  config: CategoryConfig,
  random: Random,
): BridgeCounts | undefined {
  if (islands.length === 0) return undefined

  const tree = buildSpanningTree(islands, corridors, random)
  if (!tree) return undefined

  const treeCorridors = new Set(tree.map(({ id }) => id))
  const unassigned = new Set(corridors.map(({ id }) => id))
  const solution: BridgeCounts = {}

  // Each island fixes all of its still-unknown corridors to the same extreme. Read in this order,
  // its remaining clue is either zero or the full available capacity, so the answer is forced.
  // A lone tree corridor may be single without introducing a choice.
  for (const island of shuffled(islands, random)) {
    const incident = corridors.filter(
      (corridor) =>
        unassigned.has(corridor.id) && (corridor.a === island.id || corridor.b === island.id),
    )
    if (incident.length === 0) continue

    const keepsTreeConnected = incident.some(({ id }) => treeCorridors.has(id))
    const count = keepsTreeConnected
      ? incident.length === 1
        ? random() < config.loneDoubleRate
          ? 2
          : 1
        : 2
      : random() < config.optionalGroupRate
        ? 2
        : 0

    for (const corridor of incident) {
      solution[corridor.id] = count
      unassigned.delete(corridor.id)
    }
  }

  return solution
}

function buildSpanningTree(islands: Island[], corridors: Corridor[], random: Random) {
  const visited = new Set([islands[randomIndex(islands.length, random)]!.id])
  const tree: Corridor[] = []

  while (visited.size < islands.length) {
    const candidates = corridors.filter(
      ({ a, b }) => visited.has(a) !== visited.has(b),
    )
    if (candidates.length === 0) return undefined

    const corridor = candidates[randomIndex(candidates.length, random)]!
    tree.push(corridor)
    visited.add(visited.has(corridor.a) ? corridor.b : corridor.a)
  }

  return tree
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

function chooseSeparatedCoordinates(size: number, random: Random) {
  const count = Math.ceil(size / 2)
  const gaps = Array<number>(count - 1).fill(2)
  let slack = size - 1 - gaps.length * 2

  for (const index of shuffled(
    gaps.map((_, index) => index),
    random,
  )) {
    if (slack === 0) break
    gaps[index]! += 1
    slack -= 1
  }

  return gaps.reduce<number[]>((coordinates, gap) => {
    coordinates.push(coordinates.at(-1)! + gap)
    return coordinates
  }, [0])
}

function randomIndex(length: number, random: Random) {
  return Math.floor(random() * length)
}
