<script setup lang="ts">
import { ref } from 'vue'

const funFacts = [
  "I can solve a Rubik's cube in under 120 minutes! ",
  "I've written over 400,000 lines of code this year",
  'I speak 4 programming languages fluently',
  'I once debugged code for 12 hours straight',
  'I love pair programming sessions',
  'I enjoy teaching programming to others',
]

const currentFunFact = ref(funFacts[0])

const showRandomFact = () => {
  currentFunFact.value = funFacts[Math.floor(Math.random() * funFacts.length)]
}

defineExpose({
  currentFunFact,
  showRandomFact,
})
</script>

<template>
  <UPopover mode="click">
    <UButton
      @click="showRandomFact"
      icon="i-lucide-lightbulb"
      size="sm"
      square
      variant="ghost"
      color="neutral"
    />

    <template #content>
      <div class="p-4 min-w-64">
        <h4 class="font-semibold mb-2">Fun Fact</h4>
        <p class="text-sm text-slate-600 mb-3">{{ currentFunFact }}</p>
        <div class="flex gap-2">
          <UButton @click="showRandomFact" size="sm" color="primary">
            <UIcon name="i-lucide-refresh-cw" class="w-4 h-4 mr-1" />
            Another Fact
          </UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>
