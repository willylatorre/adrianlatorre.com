<script setup lang="ts">
import { ref } from 'vue'
import AdrianStatus from './components/AdrianStatus.vue'
import CoffeeCounter from './components/CoffeeCounter.vue'
import ContactModal from './components/ContactModal.vue'
import FunFacts from './components/FunFacts.vue'

// Modal state
const isModalOpen = ref(false)

// Search groups for CommandPalette
const searchGroups = [
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
          <UDashboardNavbar title="Adrian's Playground" :toggle="false">
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
