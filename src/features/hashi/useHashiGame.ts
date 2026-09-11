import { computed, getCurrentScope, onScopeDispose, ref } from 'vue'
import { generatePuzzle, HASHI_GENERATOR_VERSION } from './generator'
import { cloneFallback } from './fallbacks'
import type { GeneratePuzzleMessage, GeneratedPuzzleMessage } from './generator.worker'
import { corridorsCross, getVisibleCorridors } from './geometry'
import {
  loadHashiState,
  saveHashiState,
  type HashiStorage,
  type PersistedHashiState,
} from './persistence'
import { evaluatePuzzle } from './rules'
import type {
  BridgeCount,
  BridgeCounts,
  Corridor,
  HashiCategory,
  HashiPuzzle,
  PuzzleEvaluation,
} from './types'

export type CycleResult =
  | { changed: true }
  | { changed: false; reason: 'crossing' | 'unknown-corridor' }

export interface HashiGameOptions {
  initialState?: PersistedHashiState
  storage?: HashiStorage | null
  generatePuzzle?: (category: HashiCategory, seed: number) => HashiPuzzle
  onChange?: () => void
}

export interface UseHashiGameOptions extends Omit<HashiGameOptions, 'initialState' | 'onChange'> {
  initialPuzzle?: HashiPuzzle
  defaultCategory?: HashiCategory
  now?: () => number
  workerFactory?: () => HashiPuzzleWorker | null
  fallbackGeneratePuzzle?: (category: HashiCategory, seed: number) => HashiPuzzle
}

export interface HashiPuzzleWorker {
  onmessage: ((event: MessageEvent<GeneratedPuzzleMessage>) => void) | null
  onerror: ((event: Event) => void) | null
  postMessage(message: GeneratePuzzleMessage): void
  terminate(): void
}

export interface HashiGame {
  readonly puzzle: HashiPuzzle
  readonly preferredCategory: HashiCategory
  readonly bridgeCounts: BridgeCounts
  readonly history: ReadonlyArray<{ corridorId: string; previous: BridgeCount }>
  readonly evaluation: PuzzleEvaluation
  readonly solvedAt: number | null
  readonly elapsedMs: number
  cycleCorridor(corridorId: string): CycleResult
  undo(): boolean
  reset(): void
  newPuzzle(): void
  selectCategory(category: HashiCategory): void
  replaceGeneratedPuzzle(puzzle: HashiPuzzle): void
}

export function createHashiGame(
  initialPuzzle: HashiPuzzle,
  now: () => number = Date.now,
  options: HashiGameOptions = {},
): HashiGame {
  const restored = options.initialState
  let puzzle = restored?.puzzle ?? initialPuzzle
  let preferredCategory = restored?.preferredCategory ?? puzzle.category
  let bridgeCounts = { ...restored?.bridgeCounts }
  let history = [...(restored?.history ?? [])]
  let evaluation = evaluatePuzzle(puzzle, bridgeCounts)
  let startedAt = restored?.startedAt ?? now()
  let solvedAt = restored?.solvedAt ?? (evaluation.solved ? now() : null)
  let puzzleSerial = 0
  const puzzleGenerator = options.generatePuzzle ?? defaultPuzzleGenerator

  const persist = () => {
    saveHashiState(
      {
        version: 1,
        preferredCategory,
        puzzle,
        bridgeCounts,
        startedAt,
        history,
        solvedAt,
      },
      options.storage,
    )
  }

  const changed = () => {
    persist()
    options.onChange?.()
  }

  const replacePuzzle = (category: HashiCategory) => {
    puzzleSerial += 1
    replaceGeneratedPuzzle(puzzleGenerator(category, Math.floor(now()) + puzzleSerial))
  }

  const replaceGeneratedPuzzle = (nextPuzzle: HashiPuzzle) => {
    puzzle = nextPuzzle
    bridgeCounts = {}
    history = []
    startedAt = now()
    solvedAt = null
    evaluation = evaluatePuzzle(puzzle, bridgeCounts)
  }

  persist()

  return {
    get puzzle() {
      return puzzle
    },
    get preferredCategory() {
      return preferredCategory
    },
    get bridgeCounts() {
      return bridgeCounts
    },
    get history() {
      return history
    },
    get evaluation() {
      return evaluation
    },
    get solvedAt() {
      return solvedAt
    },
    get elapsedMs() {
      return Math.max(0, (solvedAt ?? now()) - startedAt)
    },
    cycleCorridor(corridorId) {
      const corridor = getVisibleCorridors(puzzle.islands).find(({ id }) => id === corridorId)
      if (!corridor) return { changed: false, reason: 'unknown-corridor' }

      const previous = bridgeCounts[corridorId] ?? 0
      const next = ((previous + 1) % 3) as BridgeCount
      if (next > 0 && wouldCross(corridor, puzzle, bridgeCounts)) {
        return { changed: false, reason: 'crossing' }
      }

      history = [...history, { corridorId, previous }]
      bridgeCounts = { ...bridgeCounts, [corridorId]: next }
      evaluation = evaluatePuzzle(puzzle, bridgeCounts)
      if (evaluation.solved && solvedAt === null) solvedAt = now()
      changed()
      return { changed: true }
    },
    undo() {
      const entry = history.at(-1)
      if (!entry) return false

      history = history.slice(0, -1)
      bridgeCounts = { ...bridgeCounts, [entry.corridorId]: entry.previous }
      evaluation = evaluatePuzzle(puzzle, bridgeCounts)
      solvedAt = evaluation.solved ? (solvedAt ?? now()) : null
      changed()
      return true
    },
    reset() {
      bridgeCounts = {}
      history = []
      startedAt = now()
      solvedAt = null
      evaluation = evaluatePuzzle(puzzle, bridgeCounts)
      changed()
    },
    newPuzzle() {
      replacePuzzle(preferredCategory)
      changed()
    },
    selectCategory(category) {
      preferredCategory = category
      replacePuzzle(category)
      changed()
    },
    replaceGeneratedPuzzle(nextPuzzle) {
      preferredCategory = nextPuzzle.category
      replaceGeneratedPuzzle(nextPuzzle)
      changed()
    },
  }
}

export function useHashiGame(options: UseHashiGameOptions = {}) {
  const now = options.now ?? Date.now
  const revision = ref(0)
  const clock = ref(now())
  const generating = ref(false)
  const restored = loadHashiState(options.storage)
  const staleGeneratedPuzzle =
    restored?.puzzle.id.startsWith('hashi-') === true &&
    !restored.puzzle.id.startsWith(`hashi-${HASHI_GENERATOR_VERSION}-`)
  const activeRestored = staleGeneratedPuzzle ? null : restored
  const defaultCategory = restored?.preferredCategory ?? options.defaultCategory ?? 'intro'
  const puzzleGenerator = options.generatePuzzle ?? fallbackPuzzleGenerator
  let gameActionRevision = 0
  const initialPuzzle =
    activeRestored?.puzzle ??
    options.initialPuzzle ??
    puzzleGenerator(defaultCategory, Math.floor(now()))
  const game = createHashiGame(initialPuzzle, now, {
    initialState: activeRestored ?? undefined,
    storage: options.storage,
    generatePuzzle: puzzleGenerator,
    onChange: () => {
      gameActionRevision += 1
      revision.value += 1
    },
  })
  let worker: HashiPuzzleWorker | null = null
  let workerFailed = false
  let activeRequestId = 0
  let activeRequestGameRevision = 0

  const discardWorker = () => {
    worker?.terminate()
    worker = null
  }

  const recoverWithoutWorker = (category: HashiCategory, requestId: number) => {
    workerFailed = true
    discardWorker()
    if (requestId !== activeRequestId || category !== game.preferredCategory) return

    const generate = options.fallbackGeneratePuzzle ?? defaultPuzzleGenerator
    game.replaceGeneratedPuzzle(generate(category, Math.floor(now()) + requestId))
    generating.value = false
  }

  const requestPuzzle = (category: HashiCategory) => {
    if (options.generatePuzzle) return

    const requestId = activeRequestId + 1
    activeRequestId = requestId
    activeRequestGameRevision = gameActionRevision
    generating.value = true

    if (workerFailed) {
      recoverWithoutWorker(category, requestId)
      return
    }

    if (!worker) {
      try {
        worker = (options.workerFactory ?? createBrowserPuzzleWorker)()
      } catch {
        recoverWithoutWorker(category, requestId)
        return
      }
      if (!worker) {
        recoverWithoutWorker(category, requestId)
        return
      }
      worker.onmessage = (event) => {
        const { data } = event
        if (
          data.type !== 'generated' ||
          data.requestId !== activeRequestId ||
          data.puzzle.category !== game.preferredCategory ||
          activeRequestGameRevision !== gameActionRevision
        ) {
          return
        }
        game.replaceGeneratedPuzzle(data.puzzle)
        generating.value = false
      }
      worker.onerror = () => {
        recoverWithoutWorker(game.preferredCategory, activeRequestId)
      }
    }

    try {
      worker.postMessage({
        type: 'generate',
        category,
        seed: Math.floor(now()) + requestId,
        requestId,
      })
    } catch {
      recoverWithoutWorker(category, requestId)
    }
  }

  const value = <T>(read: () => T) =>
    computed(() => {
      void revision.value
      return read()
    })
  if (getCurrentScope()) {
    const timer = setInterval(() => {
      if (game.solvedAt === null) clock.value = now()
    }, 1_000)
    onScopeDispose(() => {
      clearInterval(timer)
      discardWorker()
    })
  }

  if (!activeRestored && !options.initialPuzzle) requestPuzzle(defaultCategory)

  return {
    puzzle: value(() => game.puzzle),
    preferredCategory: value(() => game.preferredCategory),
    bridgeCounts: value(() => game.bridgeCounts),
    history: value(() => game.history),
    evaluation: value(() => game.evaluation),
    solvedAt: value(() => game.solvedAt),
    elapsedMs: computed(() => {
      void revision.value
      void clock.value
      return game.elapsedMs
    }),
    generating,
    cycleCorridor: game.cycleCorridor,
    undo: game.undo,
    reset: game.reset,
    newPuzzle: () => {
      game.newPuzzle()
      requestPuzzle(game.preferredCategory)
    },
    selectCategory: (category: HashiCategory) => {
      game.selectCategory(category)
      requestPuzzle(category)
    },
  }
}

function defaultPuzzleGenerator(category: HashiCategory, seed: number): HashiPuzzle {
  return generatePuzzle(category, seed).puzzle
}

function fallbackPuzzleGenerator(category: HashiCategory): HashiPuzzle {
  return cloneFallback(category).puzzle
}

function createBrowserPuzzleWorker(): HashiPuzzleWorker | null {
  if (typeof Worker === 'undefined') return null
  return new Worker(new URL('./generator.worker.ts', import.meta.url), {
    type: 'module',
  }) as unknown as HashiPuzzleWorker
}

function wouldCross(candidate: Corridor, puzzle: HashiPuzzle, counts: BridgeCounts) {
  const islandById = new Map(puzzle.islands.map((island) => [island.id, island]))

  return getVisibleCorridors(puzzle.islands).some(
    (active) =>
      active.id !== candidate.id &&
      (counts[active.id] ?? 0) > 0 &&
      corridorsCross(
        { a: islandById.get(candidate.a)!, b: islandById.get(candidate.b)! },
        { a: islandById.get(active.a)!, b: islandById.get(active.b)! },
      ),
  )
}
