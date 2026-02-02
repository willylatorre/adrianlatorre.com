<script setup lang="ts">
import { computed, ref } from 'vue'
import AdrianStatus from './components/AdrianStatus.vue'
import CoffeeCounter from './components/CoffeeCounter.vue'
import ContactModal from './components/ContactModal.vue'
import FunFacts from './components/FunFacts.vue'

// Modal state
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
        label: 'Vue + Go',
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
  <UApp>
    <UDashboardGroup>
      <!-- Sidebar -->
      <UDashboardSidebar :default-size="20">
        <!-- Header -->
        <template #header>
          <div class="flex items-center gap-3 mt-5">
            <div class="w-6 h-6 bg-primary-500 rounded-lg flex items-center justify-center">
              <UIcon name="i-heroicons-code-bracket" class="w-3 h-3 text-white" />
            </div>
            <div class="flex-1">
              <h2 class="font-semibold text-slate-900">Playground</h2>
              <p class="text-xs text-slate-500 truncate">v1.37</p>
            </div>
          </div>
        </template>

        <!-- Navigation -->
        <UDashboardSearchButton class="mt-4" />
        <UDashboardSearch :groups="searchGroups" />
        <UNavigationMenu :items="links" orientation="vertical" />

        <!-- Footer -->
        <template #footer>
          <ContactModal v-model="isModalOpen" />
        </template>
      </UDashboardSidebar>

      <!-- Main Panel -->
      <UDashboardPanel>
        <!-- Navbar -->
        <template #header>
          <UDashboardNavbar title="Adrian's Playground">
            <template #right>
              <div class="flex items-center gap-4">
                <!-- Adrian Status -->
                <AdrianStatus />

                <!-- Coffee Counter -->
                <CoffeeCounter />

                <!-- Random Fun Fact Button -->
                <FunFacts />
              </div>
            </template>
          </UDashboardNavbar>
        </template>

        <!-- Main Content -->
        <template #body>
          <UContainer>
            <RouterView />
          </UContainer>
        </template>
      </UDashboardPanel>
    </UDashboardGroup>
  </UApp>
</template>

<style scoped>
/* Dashboard specific styles can go here if needed */
</style>
