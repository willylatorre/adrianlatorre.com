import { describe, expect, it } from 'vitest'
import { watermarkPassage } from '@/data/watermarkPassage'
import {
  DEMO_WATERMARK_KEY,
  createBaselineSelections,
  scoreWatermark,
  verdictForConfidence,
} from './watermarkSimulation'

describe('watermarkSimulation', () => {
  const baseline = createBaselineSelections(watermarkPassage, DEMO_WATERMARK_KEY)

  it('is deterministic for the same key and selections', () => {
    expect(scoreWatermark(watermarkPassage, baseline, baseline, DEMO_WATERMARK_KEY)).toEqual(
      scoreWatermark(watermarkPassage, baseline, baseline, DEMO_WATERMARK_KEY),
    )
  })

  it('creates a strong baseline watermark', () => {
    const result = scoreWatermark(watermarkPassage, baseline, baseline, DEMO_WATERMARK_KEY)

    expect(result.confidence).toBeGreaterThanOrEqual(95)
    expect(result.verdict).toBe('strong')
    expect(result.changedSlots).toBe(0)
  })

  it('weakens when several choices are replaced', () => {
    const edited = { ...baseline }

    for (const slot of watermarkPassage.slots.slice(0, 8)) {
      const replacement = slot.alternatives.find((choice) => choice.id !== baseline[slot.id])
      if (replacement) edited[slot.id] = replacement.id
    }

    const original = scoreWatermark(watermarkPassage, baseline, baseline, DEMO_WATERMARK_KEY)
    const changed = scoreWatermark(watermarkPassage, edited, baseline, DEMO_WATERMARK_KEY)

    expect(changed.confidence).toBeLessThan(original.confidence)
    expect(changed.changedSlots).toBe(8)
  })

  it('weakens gradually after a single edit', () => {
    const firstSlot = watermarkPassage.slots[0]
    const replacement = firstSlot?.alternatives.find(
      (choice) => choice.id !== baseline[firstSlot.id],
    )
    const edited =
      firstSlot && replacement
        ? { ...baseline, [firstSlot.id]: replacement.id }
        : { ...baseline }

    const result = scoreWatermark(watermarkPassage, edited, baseline, DEMO_WATERMARK_KEY)

    expect(result.changedSlots).toBe(1)
    expect(result.confidence).toBeGreaterThanOrEqual(80)
    expect(result.confidence).toBeLessThan(100)
  })

  it('falls back safely for invalid selections', () => {
    const result = scoreWatermark(
      watermarkPassage,
      { ...baseline, 'ring-light': 'missing-choice' },
      baseline,
      DEMO_WATERMARK_KEY,
    )

    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(100)
  })

  it('returns no evidence for an empty passage', () => {
    const result = scoreWatermark({ segments: [], slots: [] }, {}, {}, DEMO_WATERMARK_KEY)

    expect(result).toMatchObject({
      confidence: 0,
      alignedObservations: 0,
      totalObservations: 0,
    })
  })

  it.each([
    [0, 'none'],
    [79, 'none'],
    [80, 'possible'],
    [94, 'possible'],
    [95, 'strong'],
    [100, 'strong'],
  ] as const)('maps %i confidence to %s', (confidence, verdict) => {
    expect(verdictForConfidence(confidence)).toBe(verdict)
  })
})
