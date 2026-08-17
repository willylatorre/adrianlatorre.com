import type { WatermarkPassage, WatermarkSlot } from '@/data/watermarkPassage'

export const DEMO_WATERMARK_KEY = 'reading-desk-demo-key-v1'

export type SelectionMap = Record<string, string>
export type WatermarkVerdict = 'none' | 'possible' | 'strong'

export type WatermarkResult = {
  confidence: number
  verdict: WatermarkVerdict
  alignedObservations: number
  totalObservations: number
  changedSlots: number
}

const OBSERVATIONS_PER_SLOT = 4

function stableHash(value: string) {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  // FNV's lowest bits preserve patterns in similar suffixes. A Murmur-style
  // finalizer avalanches those bits before they become watermark observations.
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85ebca6b)
  hash ^= hash >>> 13
  hash = Math.imul(hash, 0xc2b2ae35)
  hash ^= hash >>> 16

  return hash >>> 0
}

function observationsFor(
  slot: WatermarkSlot,
  candidateId: string,
  context: string[],
  key: string,
) {
  return Array.from({ length: OBSERVATIONS_PER_SLOT }, (_, layer) => {
    const seed = `${key}|${context.join(':')}|${slot.id}|${candidateId}|${layer}`
    return stableHash(seed) & 1
  })
}

function binomialTail(successes: number, trials: number) {
  if (trials === 0) return 1

  const singleOutcomeProbability = 0.5 ** trials
  let coefficient = 1
  let tail = 0

  for (let count = 0; count <= trials; count += 1) {
    if (count >= successes) tail += coefficient * singleOutcomeProbability
    coefficient *= (trials - count) / (count + 1)
  }

  return Math.min(1, Math.max(0, tail))
}

function resolveChoiceId(slot: WatermarkSlot, requested: string | undefined, fallback: string) {
  if (slot.alternatives.some((choice) => choice.id === requested)) return requested as string
  if (slot.alternatives.some((choice) => choice.id === fallback)) return fallback
  return slot.alternatives[0]?.id ?? ''
}

export function createBaselineSelections(
  passage: WatermarkPassage,
  key = DEMO_WATERMARK_KEY,
): SelectionMap {
  const selections: SelectionMap = {}
  const context: string[] = []

  for (const slot of passage.slots) {
    let selectedId = slot.alternatives[0]?.id ?? ''
    let selectedScore = -1

    for (const candidate of slot.alternatives) {
      const score = observationsFor(slot, candidate.id, context, key).reduce(
        (total, observation) => total + observation,
        0,
      )

      if (score > selectedScore) {
        selectedId = candidate.id
        selectedScore = score
      }
    }

    selections[slot.id] = selectedId
    context.push(selectedId)
  }

  return selections
}

export function verdictForConfidence(confidence: number): WatermarkVerdict {
  if (confidence >= 95) return 'strong'
  if (confidence >= 80) return 'possible'
  return 'none'
}

export function scoreWatermark(
  passage: WatermarkPassage,
  selections: SelectionMap,
  baseline: SelectionMap,
  key = DEMO_WATERMARK_KEY,
): WatermarkResult {
  const context: string[] = []
  let alignedObservations = 0
  let totalObservations = 0
  let changedSlots = 0

  for (const slot of passage.slots) {
    const baselineId = resolveChoiceId(
      slot,
      baseline[slot.id],
      slot.alternatives[0]?.id ?? '',
    )
    const selectedId = resolveChoiceId(slot, selections[slot.id], baselineId)
    const observations = observationsFor(slot, selectedId, context, key)

    alignedObservations += observations.reduce(
      (total, observation) => total + observation,
      0,
    )
    totalObservations += observations.length
    if (selectedId !== baselineId) changedSlots += 1
    context.push(selectedId)
  }

  if (totalObservations === 0) {
    return {
      confidence: 0,
      verdict: 'none',
      alignedObservations: 0,
      totalObservations: 0,
      changedSlots: 0,
    }
  }

  const tail = binomialTail(alignedObservations, totalObservations)
  const confidence = Math.min(100, Math.max(0, Math.round((1 - tail) * 100)))

  return {
    confidence,
    verdict: verdictForConfidence(confidence),
    alignedObservations,
    totalObservations,
    changedSlots,
  }
}
