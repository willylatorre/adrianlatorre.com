import { getVisibleCorridors } from './geometry'
import { CATEGORY_CONFIG } from './generator'
import type { GeneratedPuzzle } from './generator'
import type { BridgeCounts, HashiCategory, HashiPuzzle } from './types'

export function cloneFallback(category: HashiCategory): GeneratedPuzzle {
  const config = CATEGORY_CONFIG[category]
  const islands = [
    { id: 'i0', x: 0, y: 0, clue: 1 },
    { id: 'i1', x: config.width - 1, y: 0, clue: 2 },
    { id: 'i2', x: config.width - 1, y: config.height - 1, clue: 1 },
  ]
  const puzzle: HashiPuzzle = {
    id: `fallback-${category}`,
    category,
    width: config.width,
    height: config.height,
    islands,
  }
  const solution = Object.fromEntries(
    getVisibleCorridors(islands).map(({ id }) => [id, 1]),
  ) as BridgeCounts

  return { puzzle, solution }
}
