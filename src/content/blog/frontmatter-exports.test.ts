import { describe, expect, it } from 'vitest'

describe('blog markdown frontmatter exports', () => {
  it('exports title/date/description from Markdown modules', async () => {
    const mod = await import('./welcome.md')

    expect(mod.default).toBeTruthy()
    expect(mod.title).toBe('Welcome')
    expect(mod.date).toMatch(/^2026-01-29/)
    expect(mod.description).toBe('A tiny blog section, with Markdown that compiles to Vue.')
  })

  it('exports frontmatter for other posts too', async () => {
    const mod = await import('./on-reading.md')

    expect(mod.title).toBe('On reading (and not over-designing)')
    expect(mod.date).toMatch(/^2026-01-15/)
    expect(mod.description).toBe('A small reminder to keep pages quiet and content-first.')
  })
})
