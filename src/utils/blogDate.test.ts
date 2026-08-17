import { describe, expect, it } from 'vitest'
import { formatBlogDate, parseBlogDateMs } from './blogDate'

describe('blogDate', () => {
  it('keeps a date-only frontmatter value on the same local calendar day', () => {
    const parsed = new Date(parseBlogDateMs('2026-08-17'))

    expect([parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate()]).toEqual([
      2026, 8, 17,
    ])
    expect(formatBlogDate('2026-08-17', 'long')).toBe('August 17, 2026')
  })

  it('keeps the Markdown loader midnight UTC export on its authored day', () => {
    expect(formatBlogDate('2026-08-17T00:00:00.000Z', 'long')).toBe('August 17, 2026')
  })

  it('returns the original value when it is not a valid date', () => {
    expect(formatBlogDate('sometime soon', 'short')).toBe('sometime soon')
  })
})
