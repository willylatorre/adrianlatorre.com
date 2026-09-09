import { generatePuzzle } from './generator'
import type { HashiCategory, HashiPuzzle } from './types'

export interface GeneratePuzzleMessage {
  type: 'generate'
  category: HashiCategory
  seed: number
  requestId: number
}

export interface GeneratedPuzzleMessage {
  type: 'generated'
  puzzle: HashiPuzzle
  requestId: number
}

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<GeneratePuzzleMessage>) => void) | null
  postMessage: (message: GeneratedPuzzleMessage) => void
}

workerScope.onmessage = (event) => {
  if (event.data.type !== 'generate') return

  const generated = generatePuzzle(event.data.category, event.data.seed)
  workerScope.postMessage({
    type: 'generated',
    puzzle: generated.puzzle,
    requestId: event.data.requestId,
  })
}
