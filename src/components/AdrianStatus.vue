<script setup lang="ts">
import { ref } from 'vue'

const adrianStatus = ref('Available')

const changeStatus = () => {
  const statuses = [
    'Available',
    'Deep in Code',
    'Coffee Break',
    'Debugging',
    'Having Ideas',
    'Procrastinating',
    'Being Awesome',
    'Thinking Deeply',
  ] as const
  adrianStatus.value = statuses[Math.floor(Math.random() * statuses.length)] || 'Available'
}

defineExpose({
  adrianStatus,
  changeStatus,
})
</script>

<template>
  <UPopover mode="click">
    <UButton @click="changeStatus" color="neutral" variant="ghost" size="sm" square>
      <UIcon name="i-lucide-smile" class="w-4 h-4" />
    </UButton>

    <template #content>
      <div class="p-4 min-w-64">
        <h4 class="font-semibold mb-3">System Status</h4>

        <!-- Status Items -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm">API Services</span>
            <div class="flex items-center gap-2">
              <div class="h-2 w-2 rounded-full bg-[var(--site-accent)]"></div>
              <span class="text-xs text-[var(--site-accent)]">Operational</span>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm">Database</span>
            <div class="flex items-center gap-2">
              <div class="h-2 w-2 rounded-full bg-[var(--site-accent)]"></div>
              <span class="text-xs text-[var(--site-accent)]">Healthy</span>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm">File System</span>
            <div class="flex items-center gap-2">
              <div class="h-2 w-2 rounded-full bg-[var(--site-accent)]"></div>
              <span class="text-xs text-[var(--site-accent)]">Issues</span>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm">Cache</span>
            <div class="flex items-center gap-2">
              <div class="h-2 w-2 rounded-full bg-[var(--site-accent)]"></div>
              <span class="text-xs text-[var(--site-accent)]">Good</span>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm">External APIs</span>
            <div class="flex items-center gap-2">
              <div class="h-2 w-2 rounded-full bg-[var(--site-accent)]"></div>
              <span class="text-xs text-[var(--site-accent)]">Connected</span>
            </div>
          </div>
        </div>

        <div class="border-t pt-3 mt-3">
          <p class="text-xs text-[var(--site-faint)]">
            Adrian's Status:
            <span class="font-medium text-[var(--site-muted)]">{{ adrianStatus }}</span>
          </p>
        </div>
      </div>
    </template>
  </UPopover>
</template>
