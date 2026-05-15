<script setup lang="ts"></script>

<template>
  <UModal>
    <UCard
      class="w-full cursor-pointer border border-[var(--site-border)] bg-[var(--site-surface)] shadow-none transition-colors hover:bg-[var(--site-surface-soft)]"
    >
      <div class="flex items-center gap-3">
        <img src="/profile-2.jpg" alt="Profile" class="w-8 h-8 rounded-full object-cover" />
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-[var(--site-ink)]">Adrian Latorre</p>
          <p class="text-xs text-[var(--site-faint)]">contact</p>
        </div>
      </div>
    </UCard>

    <template #content>
      <div class="p-6">
        <div class="text-center mb-6">
          <img
            src="/profile-2.jpg"
            alt="Profile"
            class="w-16 h-16 rounded-full object-cover mx-auto mb-4"
          />
          <h3 class="text-lg font-semibold text-[var(--site-ink)]">Adrian Latorre</h3>
          <p class="text-sm text-[var(--site-faint)]">Contact information</p>
        </div>

        <div class="space-y-4">
          <div
            class="flex items-center gap-3 rounded-lg bg-[var(--site-surface)] p-3 transition-colors hover:bg-[var(--site-surface-soft)]"
          >
            <UIcon name="i-lucide-mail" class="w-5 h-5 text-[var(--site-muted)]" />
            <a
              href="mailto:adri.latorre@gmail.com"
              class="text-sm text-[var(--site-muted)] hover:text-[var(--site-ink)]"
            >
              adri.latorre@gmail.com
            </a>
          </div>

          <div
            class="flex items-center gap-3 rounded-lg bg-[var(--site-surface)] p-3 transition-colors hover:bg-[var(--site-surface-soft)]"
          >
            <UIcon name="i-lucide-twitter" class="w-5 h-5 text-[var(--site-muted)]" />
            <a
              href="https://x.com/willylatorre"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-[var(--site-muted)] hover:text-[var(--site-ink)]"
            >
              x.com/willylatorre
            </a>
          </div>

          <div
            class="flex items-center gap-3 rounded-lg bg-[var(--site-surface)] p-3 transition-colors hover:bg-[var(--site-surface-soft)]"
          >
            <UIcon name="i-lucide-linkedin" class="w-5 h-5 text-[var(--site-muted)]" />
            <a
              href="https://linkedin.com/adrianlatorre"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-[var(--site-muted)] hover:text-[var(--site-ink)]"
            >
              linkedin.com/adrianlatorre
            </a>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
