import { describe, expect, it } from 'vitest'
import { buildBlogSidebarChildren } from './blogSidebar'

describe('buildBlogSidebarChildren', () => {
  it('returns four article rows followed by the blog index link', () => {
    expect(
      buildBlogSidebarChildren([
        { slug: 'newest', title: 'Newest', date: '2026-07-13' },
        { slug: 'second', title: 'Second', date: '2026-05-13' },
        { slug: 'third', title: 'Third', date: '2026-05-08' },
        { slug: 'fourth', title: 'Fourth', date: '2026-04-16' },
        { slug: 'older', title: 'Older', date: '2026-01-29' },
      ]),
    ).toEqual([
      { label: 'Newest', to: '/blog/newest', date: 'Jul 13', isArticle: true, class: 'group' },
      { label: 'Second', to: '/blog/second', date: 'May 13', isArticle: true, class: 'group' },
      { label: 'Third', to: '/blog/third', date: 'May 08', isArticle: true, class: 'group' },
      { label: 'Fourth', to: '/blog/fourth', date: 'Apr 16', isArticle: true, class: 'group' },
      { label: 'View all entries', to: '/blog', icon: 'i-lucide-arrow-right' },
    ])
  })

  it('keeps an unparseable date readable', () => {
    expect(buildBlogSidebarChildren([{ slug: 'draft', title: 'Draft', date: 'Coming soon' }])[0]).toMatchObject({
      date: 'Coming soon',
    })
  })
})
