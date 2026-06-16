import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '../pages/DashboardPage.vue'

function isChunkLoadError(err: unknown) {
  if (!(err instanceof Error)) return false
  return /Failed to fetch dynamically imported module|ChunkLoadError|Loading chunk .* failed/i.test(
    err.message,
  )
}

function lazy(importer: () => Promise<unknown>) {
  return () =>
    importer().catch((err) => {
      // Common in SPAs after a new deploy: the user has a cached entry chunk that
      // references a no-longer-existing lazy chunk. Reload to pick up the latest build.
      if (isChunkLoadError(err)) window.location.reload()
      return Promise.reject(err)
    })
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'About Me',
      component: DashboardPage,
    },
    {
      path: '/blog',
      name: 'Blog',
      component: lazy(() => import('../pages/BlogListPage.vue')),
    },
    {
      path: '/blog/:slug',
      name: 'Blog Post',
      component: lazy(() => import('../pages/BlogPostPage.vue')),
    },
    {
      path: '/ai-chat',
      name: 'AI Chat',
      component: lazy(() => import('../pages/AIChatPage.vue')),
    },
    {
      path: '/tiptap-llm',
      name: 'Tiptap + LLMs',
      component: lazy(() => import('../pages/TiptapPlaygroundPage.vue')),
    },
    {
      path: '/media',
      name: 'Media',
      component: lazy(() => import('../pages/MediaPage.vue')),
    },
    {
      path: '/items',
      name: 'Items',
      component: lazy(() => import('../pages/ItemsPage.vue')),
    },
    {
      path: '/vue-go',
      name: 'Vue + FastAPI',
      component: lazy(() => import('../pages/VueGoPage.vue')),
    },
    {
      path: '/settings',
      name: 'Settings',
      component: lazy(() => import('../pages/SettingsPage.vue')),
    },
  ],
})

export default router
