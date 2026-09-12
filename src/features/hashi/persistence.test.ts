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
  version: 2,
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
  hintsRemaining: 2,
  activeHint: {
    corridorId: 'a:b',
    minimumCount: 2,
    rule: 'only-route',
    title: 'Only route',
    explanation: 'This corridor needs one more bridge.',
  },
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
    expect(
      parsePersistedHashiState(JSON.stringify({ ...state, hintsRemaining: 4 })),
    ).toBeNull()
    expect(
      parsePersistedHashiState(
        JSON.stringify({
          ...state,
          activeHint: { ...state.activeHint, corridorId: 'unknown:corridor' },
        }),
      ),
    ).toBeNull()
  })

  it('migrates version-one runs with three fresh hearts and no active hint', () => {
    const {
      snapshot: _snapshot,
      hintsRemaining: _hintsRemaining,
      activeHint: _activeHint,
      ...currentState
    } = state
    const legacyState = { ...currentState, version: 1 }

    expect(parsePersistedHashiState(JSON.stringify(legacyState))).toEqual({
      ...legacyState,
      version: 2,
      snapshot: null,
      hintsRemaining: 3,
      activeHint: null,
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
