---
title: Welcome
date: 2026-01-29
description: A tiny blog section, with Markdown that compiles to Vue.
---

<script setup>
import BlogCallout from '@/components/blog/BlogCallout.vue'
</script>

<BlogCallout title="How it works">
This post is written in Markdown, compiled at build time into a Vue component — so you can embed Vue components directly in the article.
</BlogCallout>

The goal is simple: a place for short notes, with a quiet, newspaper-like layout.

## What you can do in Markdown

- Write plain Markdown.
- Add Vue components (like the callout above).
- Keep metadata in frontmatter (`title`, `date`, `description`).

> If you can write it as a Vue SFC, you can usually do it inside a Markdown post too.

