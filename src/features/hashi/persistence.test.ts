import { describe, expect, it } from 'vitest'
import {
  HASHI_STORAGE_KEY,
  loadHashiState,
  parsePersistedHashiState,
  saveHashiState,
  type HashiStorage,
  type PersistedHashiState,
} from './persistence'

const state: PersistedHashiState = {
  version: 1,
  preferredCategory: 'daily',
  puzzle: {
    id: 'persisted',
    category: 'daily',
    width: 5,
    height: 3,
    islands: [
      { id: 'a', x: 0, y: 1, clue: 1 },
      { id: 'b', x: 4, y: 1, clue: 1 },
    ],
  },
  bridgeCounts: { 'a:b': 1 },
  snapshot: { 'a:b': 0 },
  startedAt: 1_000,
  history: [{ corridorId: 'a:b', previous: 0 }],
  solvedAt: 1_500,
}

function createStorage(): HashiStorage {
  const values = new Map<string, string>()

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

describe('Hashi persistence', () => {
  it('round-trips a versioned active game', () => {
    const storage = createStorage()

    expect(saveHashiState(state, storage)).toBe(true)
    expect(loadHashiState(storage)).toEqual(state)
  })

  it('drops corrupt and obsolete local records', () => {
    const storage = createStorage()
    storage.setItem(HASHI_STORAGE_KEY, '{"version":99}')

    expect(parsePersistedHashiState('{"version":99}')).toBeNull()
    expect(parsePersistedHashiState('bad json')).toBeNull()
    expect(loadHashiState(storage)).toBeNull()
    expect(storage.getItem(HASHI_STORAGE_KEY)).toBeNull()
  })

  it('rejects invalid puzzle and bridge data', () => {
    expect(
      parsePersistedHashiState(JSON.stringify({ ...state, bridgeCounts: { 'a:b': 3 } })),
    ).toBeNull()
    expect(
      parsePersistedHashiState(
        JSON.stringify({ ...state, puzzle: { ...state.puzzle, category: 'yearly' } }),
      ),
    ).toBeNull()
    expect(
      parsePersistedHashiState(JSON.stringify({ ...state, snapshot: { 'unknown:corridor': 1 } })),
    ).toBeNull()
  })

  it('loads older active runs without a saved position', () => {
    const { snapshot: _snapshot, ...legacyState } = state

    expect(parsePersistedHashiState(JSON.stringify(legacyState))).toEqual({
      ...legacyState,
      snapshot: null,
    })
  })

  it('drops persisted active bridge pairs that cross', () => {
    const storage = createStorage()
    const crossingState: PersistedHashiState = {
      ...state,
      puzzle: {
        id: 'crossing',
        category: 'intro',
        width: 5,
        height: 5,
        islands: [
          { id: 'a', x: 0, y: 2, clue: 2 },
          { id: 'b', x: 4, y: 2, clue: 2 },
          { id: 'c', x: 2, y: 0, clue: 2 },
          { id: 'd', x: 2, y: 4, clue: 2 },
        ],
      },
      bridgeCounts: { 'a:b': 1, 'c:d': 1 },
      history: [],
    }
    storage.setItem(HASHI_STORAGE_KEY, JSON.stringify(crossingState))

    expect(loadHashiState(storage)).toBeNull()
    expect(storage.getItem(HASHI_STORAGE_KEY)).toBeNull()
  })

  it('drops a saved position whose bridges cross', () => {
    const crossingPuzzle = {
      id: 'crossing-snapshot',
      category: 'intro' as const,
      width: 5,
      height: 5,
      islands: [
        { id: 'a', x: 0, y: 2, clue: 2 },
        { id: 'b', x: 4, y: 2, clue: 2 },
        { id: 'c', x: 2, y: 0, clue: 2 },
        { id: 'd', x: 2, y: 4, clue: 2 },
      ],
    }

    expect(
      parsePersistedHashiState(
        JSON.stringify({
          ...state,
          puzzle: crossingPuzzle,
          bridgeCounts: {},
          snapshot: { 'a:b': 1, 'c:d': 1 },
          history: [],
        }),
      ),
    ).toBeNull()
  })
})
