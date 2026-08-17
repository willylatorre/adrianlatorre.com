import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const prosePreSource = readFileSync(
  fileURLToPath(new URL('./ProsePre.vue', import.meta.url)),
  'utf8',
)

const blogPostSource = readFileSync(
  fileURLToPath(new URL('../../pages/BlogPostPage.vue', import.meta.url)),
  'utf8',
)

describe('ProsePre surface ownership', () => {
  it('owns the outer border and background', () => {
    expect(prosePreSource).toMatch(
      /\.prose-pre\s*\{[^}]*border:\s*1px solid var\(--site-border\)[^}]*background:/s,
    )
  })

  it('resets page-level surface styles on its inner pre', () => {
    expect(prosePreSource).toMatch(
      /\.prose-pre\.prose-pre\s*>\s*pre\s*\{[^}]*margin:\s*0[^}]*border:\s*0[^}]*background:\s*transparent/s,
    )
  })

  it('leaves standalone fenced code styling in place', () => {
    expect(blogPostSource).toContain('.blog-prose :deep(pre)')
    expect(blogPostSource).toMatch(
      /\.blog-prose :deep\(pre\)\s*\{[^}]*border:[^}]*background:/s,
    )
  })
})
