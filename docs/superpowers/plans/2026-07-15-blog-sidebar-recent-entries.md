# Blog Sidebar Recent Entries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show four current blog articles and an all-entries link inside the existing Blog sidebar menu.

**Architecture:** Keep `UNavigationMenu` and derive Blog's nested children from its existing date-sorted posts. Use Nuxt UI's supported per-item `slot` API to render a truncated label and hover-only date without selecting component internals.

**Tech Stack:** Vue 3, TypeScript, Nuxt UI 4, Vitest, Tailwind CSS.

## Global Constraints

- Show the latest four posts in existing newest-first order.
- Article rows show titles by default, and a right-edge `MMM DD` date under a sidebar-colored gradient only on hover.
- Leave the date hidden when hover is unavailable.
- Keep Blog expanded by default and add `View all entries` to `/blog`.
- Use only documented Nuxt UI item-slot customization.

---

### Task 1: Create the pure Blog menu-data helper

**Files:**
- Create: `src/utils/blogSidebar.ts`
- Create: `src/utils/blogSidebar.test.ts`

**Interfaces:**
- `BlogPost = { slug: string; title: string; date?: string }`
- `buildBlogSidebarChildren(posts: BlogPost[])` returns four article children with `slot: 'article'` and a final blog-index child.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { buildBlogSidebarChildren } from './blogSidebar'

describe('buildBlogSidebarChildren', () => {
  it('returns four article rows followed by the blog index link', () => {
    expect(buildBlogSidebarChildren([
      { slug: 'newest', title: 'Newest', date: '2026-07-13' },
      { slug: 'second', title: 'Second', date: '2026-05-13' },
      { slug: 'third', title: 'Third', date: '2026-05-08' },
      { slug: 'fourth', title: 'Fourth', date: '2026-04-16' },
      { slug: 'older', title: 'Older', date: '2026-01-29' },
    ])).toEqual([
      { label: 'Newest', to: '/blog/newest', date: 'Jul 13', slot: 'article', class: 'group' },
      { label: 'Second', to: '/blog/second', date: 'May 13', slot: 'article', class: 'group' },
      { label: 'Third', to: '/blog/third', date: 'May 08', slot: 'article', class: 'group' },
      { label: 'Fourth', to: '/blog/fourth', date: 'Apr 16', slot: 'article', class: 'group' },
      { label: 'View all entries', to: '/blog', icon: 'i-lucide-arrow-right' },
    ])
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- src/utils/blogSidebar.test.ts`

Expected: FAIL because `src/utils/blogSidebar.ts` does not exist.

- [ ] **Step 3: Implement the helper**

```ts
export type BlogPost = { slug: string; title: string; date?: string }

function formatShortDate(date: string) {
  const ms = Date.parse(date)
  if (!Number.isFinite(ms)) return date
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit' }).format(ms)
}

export function buildBlogSidebarChildren(posts: BlogPost[]) {
  return [
    ...posts.slice(0, 4).map((post) => ({
      label: post.title,
      to: `/blog/${post.slug}`,
      date: post.date ? formatShortDate(post.date) : undefined,
      slot: 'article' as const,
      class: 'group',
    })),
    { label: 'View all entries', to: '/blog', icon: 'i-lucide-arrow-right' },
  ]
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npm test -- src/utils/blogSidebar.test.ts`

Expected: PASS with one test.

- [ ] **Step 5: Commit the helper**

Run: `git add src/utils/blogSidebar.ts src/utils/blogSidebar.test.ts && git commit -m "feat: add blog sidebar menu data"`

### Task 2: Integrate nested Blog entries and the hover-date slot

**Files:**
- Modify: `src/App.vue:10-64,147-229`

**Interfaces:**
- Consumes `buildBlogSidebarChildren(blogPosts.value)` from `src/utils/blogSidebar.ts`.
- The `article` slot receives each generated article item and displays `item.label` plus optional `item.date`.

- [ ] **Step 1: Write the failing invalid-date test**

```ts
it('keeps an unparseable date readable', () => {
  expect(buildBlogSidebarChildren([
    { slug: 'draft', title: 'Draft', date: 'Coming soon' },
  ])[0]).toMatchObject({ date: 'Coming soon' })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- src/utils/blogSidebar.test.ts`

Expected: FAIL before `formatShortDate` includes the invalid-date fallback.

- [ ] **Step 3: Implement the menu and slot**

Import `buildBlogSidebarChildren`, make `links` computed, and replace the current Blog link with:

```ts
{
  label: 'Blog',
  icon: 'i-lucide-newspaper',
  defaultOpen: true,
  children: buildBlogSidebarChildren(blogPosts.value),
}
```

Add this named slot inside `UNavigationMenu`:

```vue
<template #article="{ item }">
  <span class="relative flex min-w-0 flex-1 items-center">
    <span class="truncate">{{ item.label }}</span>
    <span
      v-if="item.date"
      class="pointer-events-none absolute inset-y-0 right-0 hidden items-center bg-gradient-to-l from-[var(--site-bg)] via-[var(--site-bg)] to-transparent pl-5 text-xs text-[var(--site-faint)] group-hover:flex"
    >
      {{ item.date }}
    </span>
  </span>
</template>
```

- [ ] **Step 4: Run the focused test and type check**

Run: `npm test -- src/utils/blogSidebar.test.ts && npm run type-check`

Expected: both exit 0.

- [ ] **Step 5: Commit the sidebar UI**

Run: `git add src/App.vue src/utils/blogSidebar.ts src/utils/blogSidebar.test.ts && git commit -m "feat: reveal blog dates on sidebar hover"`

### Task 3: Verify the integrated behavior

**Files:**
- Verify only: `src/App.vue`, `src/utils/blogSidebar.ts`, `src/utils/blogSidebar.test.ts`

- [ ] **Step 1: Run the full checks**

Run: `npm run type-check && npm run build && npm test`

Expected: all commands exit 0.

- [ ] **Step 2: Check the interactive UI**

Run: `npm run dev:client -- --port 5173`

Expected: Blog is expanded with four article rows and `View all entries`; hovering an article exposes its short date over the right-side gradient; long titles truncate.

- [ ] **Step 3: Commit any required correction after verification**

Run: `git status --short`; if only intended source files changed, stage them and commit with `fix: polish blog sidebar entries`.
