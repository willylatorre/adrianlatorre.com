import { computed, getCurrentScope, onScopeDispose, ref } from 'vue'
import { generatePuzzle, HASHI_GENERATOR_VERSION } from './generator'
import { cloneFallback } from './fallbacks'
import type { GeneratePuzzleMessage, GeneratedPuzzleMessage } from './generator.worker'
import { getPuzzleTopology, wouldCrossActiveBridge } from './geometry'
import { findHashiHint, type HashiHint, type HashiHintSearchResult } from './hints'
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
  readonly snapshot: BridgeCounts | null
  readonly canRestoreSnapshot: boolean
  readonly hintsRemaining: number
  readonly activeHint: HashiHint | null
  readonly feedbackCorridorIds: string[]
  readonly hintFeedback: string | null
  readonly evaluation: PuzzleEvaluation
  readonly solvedAt: number | null
  readonly elapsedMs: number
  cycleCorridor(corridorId: string): CycleResult
  saveSnapshot(): void
  restoreSnapshot(): boolean
  requestHint(): HashiHintSearchResult
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
  let snapshot = restored?.snapshot ? { ...restored.snapshot } : null
  let hintsRemaining = restored?.hintsRemaining ?? 3
  let activeHint = restored?.activeHint ?? null
  let feedbackCorridorIds: string[] = []
  let hintFeedback = activeHint?.explanation ?? null
  let evaluation = evaluatePuzzle(puzzle, bridgeCounts)
  let startedAt = restored?.startedAt ?? now()
  let solvedAt = restored?.solvedAt ?? (evaluation.solved ? now() : null)
  let puzzleSerial = 0
  const puzzleGenerator = options.generatePuzzle ?? defaultPuzzleGenerator

  const persist = () => {
    saveHashiState(
      {
        version: 2,
        preferredCategory,
        puzzle,
        bridgeCounts,
        snapshot,
        hintsRemaining,
        activeHint,
        startedAt,
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
    snapshot = null
    hintsRemaining = 3
    activeHint = null
    feedbackCorridorIds = []
    hintFeedback = null
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
    get snapshot() {
      return snapshot
    },
    get canRestoreSnapshot() {
      return snapshot !== null && !bridgeCountsEqual(bridgeCounts, snapshot)
    },
    get hintsRemaining() {
      return hintsRemaining
    },
    get activeHint() {
      return activeHint
    },
    get feedbackCorridorIds() {
      return feedbackCorridorIds
    },
    get hintFeedback() {
      return hintFeedback
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
      const corridor = getPuzzleTopology(puzzle).corridors.find(({ id }) => id === corridorId)
      if (!corridor) return { changed: false, reason: 'unknown-corridor' }

      const previous = bridgeCounts[corridorId] ?? 0
      const next = ((previous + 1) % 3) as BridgeCount
      if (next > 0 && wouldCrossActiveBridge(corridor, puzzle, bridgeCounts)) {
        return { changed: false, reason: 'crossing' }
      }

      bridgeCounts = { ...bridgeCounts, [corridorId]: next }
      activeHint = null
      feedbackCorridorIds = []
      hintFeedback = null
      evaluation = evaluatePuzzle(puzzle, bridgeCounts)
      if (evaluation.solved && solvedAt === null) solvedAt = now()
      changed()
      return { changed: true }
    },
    saveSnapshot() {
      snapshot = { ...bridgeCounts }
      changed()
    },
    restoreSnapshot() {
      if (snapshot === null || bridgeCountsEqual(bridgeCounts, snapshot)) return false
      bridgeCounts = { ...snapshot }
      activeHint = null
      feedbackCorridorIds = []
      hintFeedback = null
      evaluation = evaluatePuzzle(puzzle, bridgeCounts)
      solvedAt = evaluation.solved ? (solvedAt ?? now()) : null
      changed()
      return true
    },
    requestHint() {
      if (activeHint) {
        hintFeedback = activeHint.explanation
        changed()
        return { kind: 'hint', hint: activeHint }
      }

      const result = findHashiHint(puzzle, bridgeCounts)
      if (result.kind === 'hint') {
        if (hintsRemaining === 0) {
          const unavailable = {
            kind: 'none' as const,
            message: 'No hints left for this puzzle.',
          }
          hintFeedback = unavailable.message
          changed()
          return unavailable
        }
        hintsRemaining -= 1
        activeHint = result.hint
        feedbackCorridorIds = []
        hintFeedback = result.hint.explanation
      } else {
        feedbackCorridorIds = result.kind === 'invalid' ? (result.corridorIds ?? []) : []
        hintFeedback = result.message
      }
      changed()
      return result
    },
    reset() {
      bridgeCounts = {}
      snapshot = null
      activeHint = null
      feedbackCorridorIds = []
      hintFeedback = null
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

    if (activeRequestGameRevision === gameActionRevision) {
      const generate = options.fallbackGeneratePuzzle ?? fallbackPuzzleGenerator
      game.replaceGeneratedPuzzle(generate(category, Math.floor(now()) + requestId))
    }
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
          data.puzzle.category !== game.preferredCategory
        ) {
          return
        }
        if (activeRequestGameRevision === gameActionRevision)
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
    snapshot: value(() => game.snapshot),
    canRestoreSnapshot: value(() => game.canRestoreSnapshot),
    hintsRemaining: value(() => game.hintsRemaining),
    activeHint: value(() => game.activeHint),
    feedbackCorridorIds: value(() => game.feedbackCorridorIds),
    hintFeedback: value(() => game.hintFeedback),
    evaluation: value(() => game.evaluation),
    solvedAt: value(() => game.solvedAt),
    elapsedMs: computed(() => {
      void revision.value
      void clock.value
      return game.elapsedMs
    }),
    generating,
    cycleCorridor: game.cycleCorridor,
    saveSnapshot: game.saveSnapshot,
    restoreSnapshot: game.restoreSnapshot,
    requestHint: game.requestHint,
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

function bridgeCountsEqual(left: BridgeCounts, right: BridgeCounts) {
  const corridorIds = new Set([...Object.keys(left), ...Object.keys(right)])
  return [...corridorIds].every((id) => (left[id] ?? 0) === (right[id] ?? 0))
}

function defaultPuzzleGenerator(category: HashiCategory, seed: number): HashiPuzzle {
  return generatePuzzle(category, seed).puzzle
}

function fallbackPuzzleGenerator(category: HashiCategory, seed = 0): HashiPuzzle {
  return cloneFallback(category, seed).puzzle
}

function createBrowserPuzzleWorker(): HashiPuzzleWorker | null {
  if (typeof Worker === 'undefined') return null
  return new Worker(new URL('./generator.worker.ts', import.meta.url), {
    type: 'module',
  }) as unknown as HashiPuzzleWorker
}
