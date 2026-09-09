import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GeneratedPuzzleMessage } from './generator.worker'

type WorkerScope = {
  onmessage: ((event: MessageEvent) => void) | null
  postMessage: ReturnType<typeof vi.fn<(message: GeneratedPuzzleMessage) => void>>
}

let workerScope: WorkerScope

beforeEach(() => {
  vi.resetModules()
  workerScope = {
    onmessage: null,
    postMessage: vi.fn(),
  }
  vi.stubGlobal('self', workerScope)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Hashi generator worker', () => {
  it('returns the request id with its generated puzzle', async () => {
    await import('./generator.worker')

    workerScope.onmessage?.({
      data: { type: 'generate', category: 'intro', seed: 1_000, requestId: 7 },
    } as MessageEvent)

    expect(workerScope.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'generated', requestId: 7, puzzle: expect.any(Object) }),
    )
  })
})
