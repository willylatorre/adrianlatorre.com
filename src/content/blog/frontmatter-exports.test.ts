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
    expect(mod.description).toMatch(/^I built a small playground to understand/)
  })

  it('exports the Hashi build notes metadata', async () => {
    const mod = await import('./notes-from-building-hashi-one-rule-at-a-time.md')

    expect(mod.default).toBeTruthy()
    expect(mod.title).toBe('Notes From Building Hashi One Rule At A Time')
    expect(mod.date).toMatch(/^2026-09-08/)
  })

  it('places one mini board beside every Hashi implementation step', async () => {
    const source = await import('./notes-from-building-hashi-one-rule-at-a-time.md?raw')
    const kinds = [
      'visible',
      'cycle',
      'crossing',
      'totals',
      'connectivity',
      'generation',
      'uniqueness',
      'geometry',
    ]

    expect(source.default.match(/<HashiArticleDemo/g)).toHaveLength(8)
    for (const kind of kinds) expect(source.default).toContain(`kind="${kind}"`)
  })

  it('explains the Hashi generator house rules', async () => {
    const source = await import('./notes-from-building-hashi-one-rule-at-a-time.md?raw')

    expect(source.default).toContain('house rule')
    expect(source.default).toContain('eight neighboring cells')
    expect(source.default).toContain('explicit island target')
    expect(source.default).toContain('### Density is the difficulty dial')
    expect(source.default).toContain('More islands create more corridors')
    expect(source.default).not.toContain('## First, decide which bridges can exist')
  })
})
