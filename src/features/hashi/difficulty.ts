import { findHashiHint } from './hints'
import { evaluatePuzzle } from './rules'
import type { BridgeCounts, HashiPuzzle } from './types'

export type HashiDifficulty = 'easy' | 'medium' | 'hard'

export interface DifficultyAssessment {
  solved: boolean
  timedOut: boolean
  difficulty: HashiDifficulty | null
  steps: number
  connectivity: number
  contradiction: number
}

/** A reproducible rule-based estimate, not a prediction of a player's solve time. */
export function difficultyFromTrace(
  trace: Pick<DifficultyAssessment, 'steps' | 'connectivity' | 'contradiction'>,
): HashiDifficulty {
  if (!trace.connectivity && !trace.contradiction) return 'easy'
  return trace.contradiction / Math.max(1, trace.steps) >= 0.015 ? 'hard' : 'medium'
}

/** Solve from blank using explainable hints, without reading the generated answer. */
export function assessDifficulty(
  puzzle: HashiPuzzle,
  shouldStop = () => false,
): DifficultyAssessment {
  const counts: BridgeCounts = {}
  const result: DifficultyAssessment = {
    solved: false,
    timedOut: false,
    difficulty: null,
    steps: 0,
    connectivity: 0,
    contradiction: 0,
  }
  // Each hint raises a bridge count; total clue capacity bounds the trace length.
  const maxSteps = puzzle.islands.reduce((sum, island) => sum + island.clue, 0) / 2
  let bridgeTotal = 0
  for (let step = 0; step <= maxSteps; step++) {
    if (shouldStop()) {
      result.timedOut = true
      return result
    }
    if (bridgeTotal === maxSteps && evaluatePuzzle(puzzle, counts).solved) {
      result.solved = true
      result.difficulty = difficultyFromTrace(result)
      return result
    }
    const next = findHashiHint(puzzle, counts)
    if (next.kind !== 'hint') return result
    const hint = next.hint
    if (hint.minimumCount <= (counts[hint.corridorId] ?? 0)) return result
    bridgeTotal += hint.minimumCount - (counts[hint.corridorId] ?? 0)
    counts[hint.corridorId] = hint.minimumCount
    result.steps++
    if (hint.rule === 'connectivity') result.connectivity++
    if (hint.rule === 'contradiction') result.contradiction++
  }
  return result
}
