import fallbackPuzzles from './fallback-puzzles.json'
import type { HashiCategory, PuzzleGenerationResult, GeneratedPuzzle } from './types'

export function cloneFallback(category: HashiCategory, seed = 0): PuzzleGenerationResult {
  const pool = fallbackPuzzles[category] as unknown as GeneratedPuzzle[]
  return { ...structuredClone(pool[(seed >>> 0) % pool.length]!), source: 'fallback' }
}
