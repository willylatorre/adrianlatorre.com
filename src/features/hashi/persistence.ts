import { corridorsCross, getVisibleCorridors } from './geometry'
import type { BridgeCount, BridgeCounts, HashiCategory, HashiPuzzle, Island } from './types'

export const HASHI_STORAGE_KEY = 'adrianlatorre.hashi.v1'

export interface HashiStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface PersistedHashiState {
  version: 1
  preferredCategory: HashiCategory
  puzzle: HashiPuzzle
  bridgeCounts: BridgeCounts
  snapshot?: BridgeCounts | null
  startedAt: number
  /** Accepted only for backward compatibility with runs saved before snapshots replaced Undo. */
  history?: Array<{ corridorId: string; previous: BridgeCount }>
  solvedAt?: number | null
}

export function loadHashiState(storage?: HashiStorage | null): PersistedHashiState | null {
  const target = resolveStorage(storage)
  if (!target) return null

  try {
    const state = parsePersistedHashiState(target.getItem(HASHI_STORAGE_KEY))
    if (!state) target.removeItem(HASHI_STORAGE_KEY)
    return state
  } catch {
    return null
  }
}

export function saveHashiState(state: PersistedHashiState, storage?: HashiStorage | null): boolean {
  const target = resolveStorage(storage)
  if (!target) return false

  try {
    target.setItem(HASHI_STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function parsePersistedHashiState(raw: string | null): PersistedHashiState | null {
  if (!raw) return null

  try {
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value) || value.version !== 1 || !isCategory(value.preferredCategory)) return null
    if (!isPuzzle(value.puzzle) || !isBridgeCounts(value.bridgeCounts, value.puzzle)) return null
    if (hasCrossingBridgeCounts(value.puzzle, value.bridgeCounts)) return null
    if (
      value.snapshot !== undefined &&
      value.snapshot !== null &&
      (!isBridgeCounts(value.snapshot, value.puzzle) ||
        hasCrossingBridgeCounts(value.puzzle, value.snapshot))
    ) {
      return null
    }
    if (!isTimestamp(value.startedAt) || !isHistory(value.history, value.puzzle)) return null
    if (value.solvedAt !== undefined && value.solvedAt !== null && !isTimestamp(value.solvedAt)) {
      return null
    }

    return {
      version: 1,
      preferredCategory: value.preferredCategory,
      puzzle: value.puzzle,
      bridgeCounts: value.bridgeCounts,
      snapshot: value.snapshot ?? null,
      startedAt: value.startedAt,
      history: value.history,
      solvedAt: value.solvedAt ?? null,
    }
  } catch {
    return null
  }
}

export function isCategory(value: unknown): value is HashiCategory {
  return value === 'intro' || value === 'daily' || value === 'weekly' || value === 'monthly'
}

function resolveStorage(storage?: HashiStorage | null): HashiStorage | null {
  try {
    if (storage !== undefined) return storage
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

function isPuzzle(value: unknown): value is HashiPuzzle {
  if (!isRecord(value) || typeof value.id !== 'string' || !isCategory(value.category)) return false
  if (
    !isPositiveInteger(value.width) ||
    !isPositiveInteger(value.height) ||
    !Array.isArray(value.islands)
  ) {
    return false
  }

  const ids = new Set<string>()
  return value.islands.length > 0 && value.islands.every((island) => isIsland(island, ids))
}

function isIsland(value: unknown, ids: Set<string>): value is Island {
  if (!isRecord(value) || typeof value.id !== 'string' || ids.has(value.id)) return false
  if (!Number.isInteger(value.x) || !Number.isInteger(value.y)) return false
  if (
    typeof value.clue !== 'number' ||
    !Number.isInteger(value.clue) ||
    value.clue < 1 ||
    value.clue > 8
  ) {
    return false
  }
  ids.add(value.id)
  return true
}

function isBridgeCounts(value: unknown, puzzle: HashiPuzzle): value is BridgeCounts {
  if (!isRecord(value)) return false
  const corridorIds = new Set(getVisibleCorridors(puzzle.islands).map(({ id }) => id))
  return Object.entries(value).every(
    ([corridorId, count]) => corridorIds.has(corridorId) && isBridgeCount(count),
  )
}

function hasCrossingBridgeCounts(puzzle: HashiPuzzle, counts: BridgeCounts) {
  const islandById = new Map(puzzle.islands.map((island) => [island.id, island]))
  const activeCorridors = getVisibleCorridors(puzzle.islands).filter(
    (corridor) => (counts[corridor.id] ?? 0) > 0,
  )

  return activeCorridors.some((corridor, index) =>
    activeCorridors
      .slice(index + 1)
      .some((other) =>
        corridorsCross(
          { a: islandById.get(corridor.a)!, b: islandById.get(corridor.b)! },
          { a: islandById.get(other.a)!, b: islandById.get(other.b)! },
        ),
      ),
  )
}

function isHistory(
  value: unknown,
  puzzle: HashiPuzzle,
): value is Array<{ corridorId: string; previous: BridgeCount }> {
  if (value === undefined) return true
  if (!Array.isArray(value)) return false
  const corridorIds = new Set(getVisibleCorridors(puzzle.islands).map(({ id }) => id))
  return value.every(
    (entry) =>
      isRecord(entry) &&
      typeof entry.corridorId === 'string' &&
      corridorIds.has(entry.corridorId) &&
      isBridgeCount(entry.previous),
  )
}

function isBridgeCount(value: unknown): value is BridgeCount {
  return value === 0 || value === 1 || value === 2
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
