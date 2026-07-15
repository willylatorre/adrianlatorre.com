export type BlogPost = {
  slug: string
  title: string
  date?: string
}

function formatShortDate(date: string) {
  const ms = Date.parse(date)
  if (!Number.isFinite(ms)) return date

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(ms)
}

export function buildBlogSidebarChildren(posts: BlogPost[]) {
  return [
    ...posts.slice(0, 4).map((post) => ({
      label: post.title,
      to: `/blog/${post.slug}`,
      date: post.date ? formatShortDate(post.date) : undefined,
      isArticle: true,
      class: 'group',
    })),
    { label: 'View all entries', to: '/blog', icon: 'i-lucide-arrow-right' },
  ]
}
