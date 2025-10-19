<script setup lang="ts"></script>

<template>
  <UModal>
    <UCard class="cursor-pointer shadow-md hover:shadow-lg transition-shadow w-full">
      <div class="flex items-center gap-3">
        <img src="/profile-2.jpg" alt="Profile" class="w-8 h-8 rounded-full object-cover" />
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-slate-900">Adrian Latorre</p>
          <p class="text-xs text-slate-500">contact</p>
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
          <h3 class="text-lg font-semibold text-slate-900">Adrian Latorre</h3>
          <p class="text-sm text-slate-500">Contact Information</p>
        </div>

        <div class="space-y-4">
          <div
            class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <UIcon name="i-lucide-mail" class="w-5 h-5 text-slate-600" />
            <a
              href="mailto:adri.latorre@gmail.com"
              class="text-sm text-slate-700 hover:text-slate-900"
            >
              adri.latorre@gmail.com
            </a>
          </div>

          <div
            class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <UIcon name="i-lucide-twitter" class="w-5 h-5 text-slate-600" />
            <a
              href="https://x.com/willylatorre"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-slate-700 hover:text-slate-900"
            >
              x.com/willylatorre
            </a>
          </div>

          <div
            class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <UIcon name="i-lucide-linkedin" class="w-5 h-5 text-slate-600" />
            <a
              href="https://linkedin.com/adrianlatorre"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-slate-700 hover:text-slate-900"
            >
              linkedin.com/adrianlatorre
            </a>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
