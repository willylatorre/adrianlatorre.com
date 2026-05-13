<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import type { Component } from 'vue'

type BlogFrontmatter = {
  title: string
  date?: string
  description?: string
}

function formatDate(date: string) {
  const ms = Date.parse(date)
  if (!Number.isFinite(ms)) return date
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  }).format(ms)
}

const route = useRoute()

type BlogModule = {
  default: Component
  title?: unknown
  date?: unknown
  description?: unknown
}

const mdModules = import.meta.glob('../content/blog/*.md') as Record<
  string,
  () => Promise<BlogModule>
>

const postComponent = ref<Component | null>(null)
const frontmatter = ref<BlogFrontmatter | null>(null)
const notFound = ref(false)

watchEffect((onInvalidate) => {
  const slug = String(route.params.slug ?? '')
  let cancelled = false

  onInvalidate(() => {
    cancelled = true
  })

  notFound.value = false
  postComponent.value = null
  frontmatter.value = null

  const mdPath = Object.keys(mdModules).find((p) => p.endsWith(`/${slug}.md`))

  if (!mdPath) {
    notFound.value = true
    return
  }

  const loadMd = mdModules[mdPath]
  if (!loadMd) {
    notFound.value = true
    return
  }

  ;(async () => {
    const mod = await loadMd()
    if (cancelled) return

    const title = typeof mod.title === 'string' ? mod.title : slug
    const date = typeof mod.date === 'string' ? mod.date : undefined
    const description = typeof mod.description === 'string' ? mod.description : undefined

    frontmatter.value = { title, date, description }
    postComponent.value = mod.default
  })().catch(() => {
    if (cancelled) return
    notFound.value = true
  })
})
</script>

<template>
  <div v-if="notFound" class="blog-shell">
    <header class="blog-header">
      <p class="blog-kicker">Blog</p>
      <h1 class="blog-headline">Not found</h1>
      <p class="blog-dek">This article doesn’t exist.</p>
    </header>

    <RouterLink class="blog-back" to="/blog">← Back to all articles</RouterLink>
  </div>

  <article v-else class="blog-shell">
    <header class="blog-header">
      <p class="blog-kicker">Blog</p>
      <h1 class="blog-headline">{{ frontmatter?.title ?? '…' }}</h1>
      <p v-if="frontmatter?.date" class="blog-date">{{ formatDate(frontmatter.date) }}</p>
      <p v-if="frontmatter?.description" class="blog-dek">{{ frontmatter.description }}</p>
    </header>

    <div v-if="postComponent" class="blog-prose">
      <component :is="postComponent" />
    </div>
    <p v-else class="blog-loading">Loading…</p>

    <footer class="blog-footer">
      <RouterLink class="blog-back" to="/blog">← Back to all articles</RouterLink>
    </footer>
  </article>
</template>

<style scoped>
.blog-shell {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 0;
  color: rgb(15 23 42);
  font-family: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;
}

.blog-header {
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.2);
  margin-bottom: 22px;
}

.blog-kicker {
  font-variant: small-caps;
  letter-spacing: 0.14em;
  font-size: 12px;
  margin: 0 0 6px;
}

.blog-headline {
  font-size: 38px;
  line-height: 1.1;
  margin: 0;
}

.blog-date {
  margin: 10px 0 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.7);
}

.blog-dek {
  margin: 12px 0 0;
  color: rgba(15, 23, 42, 0.78);
  max-width: 68ch;
}

.blog-loading {
  margin: 20px 0 0;
  color: rgba(15, 23, 42, 0.75);
}

.blog-footer {
  margin-top: 30px;
  padding-top: 18px;
  border-top: 1px solid rgba(15, 23, 42, 0.15);
}

.blog-back {
  display: inline-block;
  text-decoration: none;
  color: rgba(15, 23, 42, 0.92);
  border-bottom: 1px solid rgba(15, 23, 42, 0.35);
  padding-bottom: 2px;
}

.blog-back:hover {
  border-bottom-color: rgba(15, 23, 42, 0.75);
}

.blog-prose :deep(p) {
  margin: 14px 0;
  line-height: 1.75;
  font-size: 16px;
  max-width: 72ch;
}

.blog-prose :deep(h2) {
  margin: 28px 0 12px;
  font-size: 22px;
  line-height: 1.25;
}

.blog-prose :deep(h3) {
  margin: 24px 0 10px;
  font-size: 18px;
  line-height: 1.25;
}

.blog-prose :deep(a) {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.blog-prose :deep(blockquote) {
  margin: 18px 0;
  padding: 6px 0 6px 14px;
  border-left: 3px solid rgba(15, 23, 42, 0.25);
  color: rgba(15, 23, 42, 0.85);
}

.blog-prose :deep(ul),
.blog-prose :deep(ol) {
  margin: 14px 0;
  padding-left: 1.4rem;
  line-height: 1.75;
  max-width: 72ch;
}

.blog-prose :deep(ul) {
  list-style: disc outside;
}

.blog-prose :deep(ol) {
  list-style: decimal outside;
}

.blog-prose :deep(li) {
  margin: 6px 0;
  padding-left: 0.2rem;
}

.blog-prose :deep(code) {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 0.95em;
  background: rgba(15, 23, 42, 0.06);
  padding: 0.1em 0.3em;
}

.blog-prose :deep(pre) {
  margin: 18px 0;
  padding: 14px 16px;
  overflow: auto;
  border: 1px solid rgba(15, 23, 42, 0.18);
  background: rgba(15, 23, 42, 0.03);
}

.blog-prose :deep(pre code) {
  background: transparent;
  padding: 0;
}

.blog-prose :deep(pre code.hljs) {
  padding: 0;
}

.blog-prose :deep(.video-embed) {
  position: relative;
  width: 100%;
  max-width: 720px;
  aspect-ratio: 16 / 9;
  margin: 22px 0;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.18);
  background: rgba(15, 23, 42, 0.04);
}

.blog-prose :deep(.video-embed iframe) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
</style>
