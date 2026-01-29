import { describe, expect, it } from 'vitest'
import { parseFrontmatter } from './frontmatter'

describe('parseFrontmatter', () => {
  it('returns empty data when no frontmatter present', () => {
    const raw = '# Hello\n\nWorld'
    expect(parseFrontmatter(raw)).toEqual({ data: {}, content: raw })
  })

  it('parses basic YAML frontmatter and returns remaining content', () => {
    const raw = ['---', 'title: Hello', 'date: 2025-01-01', '---', '# Post'].join('\n')
    expect(parseFrontmatter(raw)).toEqual({
      data: { title: 'Hello', date: '2025-01-01' },
      content: '# Post',
    })
  })

  it('supports frontmatter ending at EOF', () => {
    const raw = ['---', 'title: Hello', '---'].join('\n')
    expect(parseFrontmatter(raw)).toEqual({
      data: { title: 'Hello' },
      content: '',
    })
  })

  it('normalizes CRLF line endings', () => {
    const raw = '---\r\ntitle: Hello\r\n---\r\n# Post\r\n'
    const result = parseFrontmatter(raw)
    expect(result.data.title).toBe('Hello')
    expect(result.content).toBe('# Post\n')
    expect(result.content.includes('\r')).toBe(false)
  })

  it('stringifies number/boolean scalar values', () => {
    const raw = ['---', 'views: 2', 'published: true', '---', 'Body'].join('\n')
    expect(parseFrontmatter(raw)).toEqual({
      data: { views: '2', published: 'true' },
      content: 'Body',
    })
  })

  it('ignores non-scalar YAML values (objects/arrays)', () => {
    const raw = ['---', 'meta:', '  desc: Hi', 'tags:', '  - a', '---', 'Body'].join('\n')
    const result = parseFrontmatter(raw)
    expect(result.data.meta).toBeUndefined()
    expect(result.data.tags).toBeUndefined()
    expect(result.content).toBe('Body')
  })

  it('treats unclosed frontmatter as plain markdown', () => {
    const raw = ['---', 'title: Hello', '# Post'].join('\n')
    expect(parseFrontmatter(raw)).toEqual({ data: {}, content: raw })
  })
})
