import { describe, expect, it } from 'vitest'

describe('blog markdown frontmatter exports', () => {
  it('exports title/date/description from Markdown modules', async () => {
    const mod = await import('./notes-from-digging-into-moltbots-ai-memory.md')

    expect(mod.default).toBeTruthy()
    expect(mod.title).toBe('Notes From Digging Into OpenClaw’s AI Memory')
    expect(mod.date).toMatch(/^2026-01-29/)
    expect(mod.description).toMatch(/^A practical tour of agent memory files,/)
  })

  it('exports the text watermark article metadata', async () => {
    const mod = await import('./notes-from-hiding-a-watermark-in-plain-text.md')

    expect(mod.default).toBeTruthy()
    expect(mod.title).toBe('Notes From Hiding A Watermark In Plain Text')
    expect(mod.date).toMatch(/^2026-08-17/)
    expect(mod.description).toMatch(/^What changes when an AI leaves a statistical signature/)
  })
})
