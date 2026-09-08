import { getVisibleCorridors } from './geometry'
import { CATEGORY_CONFIG } from './generator'
import type { GeneratedPuzzle } from './generator'
import type { BridgeCounts, HashiCategory, HashiPuzzle } from './types'

const FALLBACK_XS: Record<HashiCategory, number[]> = {
  intro: [1, 5, 9, 13],
  daily: [1, 8, 15, 22, 28],
  weekly: [1, 9, 17, 25, 33],
  monthly: [1, 10, 20, 30, 38],
}

export function cloneFallback(category: HashiCategory): GeneratedPuzzle {
  const config = CATEGORY_CONFIG[category]
  const xs = FALLBACK_XS[category]
  const y = Math.floor(config.height / 2)
  const islands = xs.map((x, index) => ({
    id: `i${index}`,
    x,
    y,
    clue: index === 0 || index === xs.length - 1 ? 1 : 2,
  }))
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
