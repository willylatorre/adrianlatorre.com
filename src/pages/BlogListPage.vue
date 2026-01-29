<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'

type BlogPost = {
  slug: string
  title: string
  date?: string
  description?: string
}

function parseDateMs(date?: string) {
  if (!date) return 0
  const ms = Date.parse(date)
  return Number.isFinite(ms) ? ms : 0
}

function formatDate(date: string) {
  const ms = Date.parse(date)
  if (!Number.isFinite(ms)) return date
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(ms)
}

type BlogModule = {
  default: Component
  title?: unknown
  date?: unknown
  description?: unknown
}

const postModules = import.meta.glob('../content/blog/*.md', {
  eager: true,
}) as Record<string, BlogModule>

const posts = computed<BlogPost[]>(() => {
  return Object.entries(postModules)
    .map(([path, mod]) => {
      const slug = path.split('/').pop()?.replace(/\.md$/, '') ?? path

      const title = typeof mod.title === 'string' ? mod.title : slug
      const date = typeof mod.date === 'string' ? mod.date : undefined
      const description = typeof mod.description === 'string' ? mod.description : undefined

      return { slug, title, date, description }
    })
    .sort((a, b) => parseDateMs(b.date) - parseDateMs(a.date))
})
</script>

<template>
  <div class="blog-shell">
    <header class="blog-header">
      <p class="blog-kicker">Blog</p>
      <h1 class="blog-headline">Articles</h1>
      <p class="blog-dek">Minimal notes, written in Markdown.</p>
    </header>

    <ol class="blog-list">
      <li v-for="post in posts" :key="post.slug" class="blog-list__item">
        <RouterLink class="blog-link" :to="`/blog/${post.slug}`">
          <span class="blog-title">{{ post.title }}</span>
        </RouterLink>
        <div class="blog-meta">
          <span v-if="post.date" class="blog-date">{{ formatDate(post.date) }}</span>
        </div>
        <p v-if="post.description" class="blog-desc">
          {{ post.description }}
        </p>
      </li>
    </ol>
  </div>
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
  margin-bottom: 18px;
}

.blog-kicker {
  font-variant: small-caps;
  letter-spacing: 0.14em;
  font-size: 12px;
  margin: 0 0 6px;
}

.blog-headline {
  font-size: 34px;
  line-height: 1.1;
  margin: 0;
}

.blog-dek {
  margin: 10px 0 0;
  color: rgba(15, 23, 42, 0.75);
  max-width: 62ch;
}

.blog-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.blog-list__item {
  padding: 18px 0;
  border-bottom: 1px dashed rgba(15, 23, 42, 0.22);
}

.blog-link {
  text-decoration: none;
  color: inherit;
}

.blog-link:hover .blog-title {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.blog-title {
  font-size: 20px;
  line-height: 1.3;
}

.blog-meta {
  margin-top: 6px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.7);
}

.blog-desc {
  margin: 10px 0 0;
  color: rgba(15, 23, 42, 0.82);
  max-width: 70ch;
}
</style>
