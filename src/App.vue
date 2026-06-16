<script setup lang="ts">
import { computed, ref } from 'vue'
import AdrianStatus from './components/AdrianStatus.vue'
import CoffeeCounter from './components/CoffeeCounter.vue'
import ContactModal from './components/ContactModal.vue'
import FunFacts from './components/FunFacts.vue'

const isModalOpen = ref(false)

type BlogPost = {
  slug: string
  title: string
  date?: string
  description?: string
}

type BlogModule = {
  title?: unknown
  date?: unknown
  description?: unknown
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

const postModules = import.meta.glob('./content/blog/*.md', {
  eager: true,
}) as Record<string, BlogModule>

const blogPosts = computed<BlogPost[]>(() => {
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

// Search groups for CommandPalette
const baseSearchGroups = [
  {
    id: 'about-me',
    label: 'About Me',
    items: [
      {
        label: 'About Me',
        suffix: 'My profile',
        to: '/',
        icon: 'i-lucide-user',
      },
      {
        label: 'Blog',
        suffix: 'Articles',
        to: '/blog',
        icon: 'i-lucide-newspaper',
      },
      {
        label: 'Contact',
        suffix: 'adrian@example.com',
        action: () => {
          window.open('mailto:adrian@example.com', '_blank')
        },
        icon: 'i-lucide-mail',
      },
      {
        label: 'GitHub',
        suffix: '@adrianlatorre',
        action: () => {
          window.open('https://github.com/adrianlatorre', '_blank')
        },
        icon: 'i-lucide-github',
      },
    ],
  },
  {
    id: 'playground',
    label: 'Playground',
    items: [
      {
        label: 'AI Chat',
        suffix: 'Interactive conversation',
        to: '/ai-chat',
        icon: 'i-lucide-message-circle',
      },
      {
        label: 'Tiptap + LLMs',
        suffix: 'Editor workflows',
        to: '/tiptap-llm',
        icon: 'i-lucide-text-cursor-input',
      },
    ],
  },
  {
    id: 'media',
    label: 'Pet projects',
    items: [
      {
        label: 'Projects & Videos',
        suffix: 'Personal work and presentations',
        to: '/media',
        icon: 'i-lucide-play-circle',
      },
    ],
  },
]

const blogSearchGroup = computed(() => {
  const items = blogPosts.value.map((post) => ({
    label: post.title,
    suffix: post.description ?? (post.date ? formatDate(post.date) : undefined),
    to: `/blog/${post.slug}`,
    icon: 'i-lucide-file-text',
  }))

  return {
    id: 'articles',
    label: 'Articles',
    items,
  }
})

const searchGroups = computed(() => [...baseSearchGroups, blogSearchGroup.value])

const links = [
  {
    label: 'Links',
    type: 'label' as const,
  },
  {
    label: 'About Me',
    icon: 'i-lucide-user',
    to: '/',
  },
  {
    label: 'Blog',
    icon: 'i-lucide-newspaper',
    to: '/blog',
  },
  {
    label: 'Playground',
    icon: 'i-lucide-command',
    defaultOpen: true,
    children: [
      {
        label: 'AI Chat',
        icon: 'i-lucide-message-circle',
        to: '/ai-chat',
      },
      {
        label: 'Tiptap + LLMs',
        icon: 'i-lucide-text-cursor-input',
        to: '/tiptap-llm',
      },
      {
        label: 'Stocks',
        icon: 'i-lucide-trending-up',
        to: '/stocks',
        disabled: true,
      },
      {
        label: 'Workflows',
        icon: 'i-lucide-workflow',
        to: '/workflow',
        disabled: true,
      },
      {
        label: 'Vue + FastAPI',
        icon: 'i-lucide-code',
        to: '/vue-go',
      },
    ],
  },
  {
    label: 'Pet projects',
    icon: 'i-lucide-play-circle',
    to: '/media',
  },
]
</script>

<template>
  <UApp class="min-h-dvh bg-[var(--site-bg)] text-[var(--site-ink)]">
    <UDashboardGroup>
      <UDashboardSidebar :default-size="18" class="border-[var(--site-border)] bg-[var(--site-bg)]">
        <template #header>
          <div class="mt-4 flex items-center gap-3">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--site-border)] bg-[var(--site-surface)] text-[var(--site-muted)]"
            >
              <UIcon name="i-heroicons-code-bracket" class="h-4 w-4" />
            </div>
            <div class="flex-1">
              <h2 class="text-sm font-medium tracking-tight text-[var(--site-ink)]">Playground</h2>
              <p class="truncate text-xs text-[var(--site-faint)]">v1.37</p>
            </div>
          </div>
        </template>

        <UDashboardSearchButton class="mt-5" />
        <UDashboardSearch :groups="searchGroups" />
        <UNavigationMenu :items="links" orientation="vertical" />

        <template #footer>
          <ContactModal v-model="isModalOpen" />
        </template>
      </UDashboardSidebar>

      <UDashboardPanel>
        <template #header>
          <UDashboardNavbar
            title="Adrian Latorre"
            class="border-[var(--site-border)] bg-[var(--site-bg)]"
          >
            <template #right>
              <div class="flex items-center gap-2">
                <AdrianStatus />
                <CoffeeCounter />
                <FunFacts />
              </div>
            </template>
          </UDashboardNavbar>
        </template>

        <template #body>
          <UContainer class="px-5 py-8 sm:px-8 lg:px-10 lg:py-14">
            <RouterView />
          </UContainer>
        </template>
      </UDashboardPanel>
    </UDashboardGroup>
  </UApp>
</template>
