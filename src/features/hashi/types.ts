export type HashiCategory = 'intro' | 'daily' | 'weekly' | 'monthly'
export type Axis = 'horizontal' | 'vertical'
export type BridgeCount = 0 | 1 | 2
export type BridgeCounts = Record<string, BridgeCount>

export interface Island {
  id: string
  x: number
  y: number
  clue: number
}

export interface Corridor {
  id: string
  a: string
  b: string
  axis: Axis
}

export interface HashiPuzzle {
  id: string
  category: HashiCategory
  width: number
  height: number
  islands: Island[]
}

export interface LineSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type IslandState = 'open' | 'satisfied' | 'overfilled'

export interface PuzzleEvaluation {
  allCountsMatch: boolean
  connected: boolean
  solved: boolean
  strandedIslandIds: string[]
}
