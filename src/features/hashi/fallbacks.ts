import { generateFallbackPuzzle } from './generator'
import type { GeneratedPuzzle } from './generator'
import type { HashiCategory } from './types'

export function cloneFallback(category: HashiCategory): GeneratedPuzzle {
  const generated = generateFallbackPuzzle(category)

  return {
    puzzle: {
      ...generated.puzzle,
      islands: generated.puzzle.islands.map((island) => ({ ...island })),
    },
    solution: { ...generated.solution },
  }
}
