<script setup lang="ts">
import { ref } from 'vue'
import { useChat } from '@/composables/useChat'

const { messages, status, sendMessage } = useChat()
const input = ref('')

const handleSubmit = async (event?: Event) => {
  event?.preventDefault()
  const prompt = input.value
  if (!prompt.trim()) return
  await sendMessage(prompt)
  input.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <!-- Page Header -->
    <div>
      <h1 class="text-3xl font-bold text-slate-900 mb-2">AI Interview Experiment</h1>
      <p class="text-slate-600 max-w-2xl space-y-2">
        <span>
          Interview AI Adrian about his life and experiences. Each response generates a unique
          32-bit pixel art visualization, creating a visual story alongside the conversation. 🎮✨
        </span>
        <span>
          Using the
          <a
            class="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:text-slate-700"
            href="https://github.com/openai/openai-go"
            target="_blank"
            rel="noopener"
          >
            official openai-go SDK
          </a>
          for chat and DALL-E for image generation.
        </span>
      </p>
    </div>

    <!-- Chat Palette -->
    <div class="mt-[3rem]">
      <UChatPalette class="h-[28rem] border border-slate-200 rounded overflow-hidden">
        <UChatMessages
          :assistant="{ variant: 'outline' }"
          :messages="messages as any"
          :status="status"
          :should-auto-scroll="true"
        >
          <UChatMessage
            v-for="message in messages"
            :key="message.id"
            v-bind="
              {
                ...message,
                ...(message.role === 'user'
                  ? { side: 'right' as const, variant: 'soft' as const }
                  : { side: 'left' as const, variant: 'outline' as const }),
              } as any
            "
          >
            <template #content>
              <div class="space-y-1">
                <template v-for="(part, index) in message.parts" :key="index">
                  <div v-if="part.type === 'text'">
                    {{ part.text }}
                  </div>
                  <div v-else-if="part.type === 'image'">
                    <img
                      :src="part.url"
                      :alt="part.alt || 'Generated illustration'"
                      class="rounded w-64 h-64 object-cover shadow-md"
                    />
                  </div>
                </template>
              </div>
            </template>
          </UChatMessage>
        </UChatMessages>

        <template #prompt>
          <UContainer class="flex flex-col gap-3 py-4 bg-slate-100">
            <UChatPrompt
              v-model="input"
              placeholder="Ask Adrian about his experiences..."
              @submit="handleSubmit"
            >
              <UChatPromptSubmit :status="status" />
            </UChatPrompt>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-bot" class="w-5 h-5 text-slate-400" />
              <span class="text-sm text-slate-500">GPT-5</span>
            </div>
          </UContainer>
        </template>
      </UChatPalette>
    </div>

    <!-- Takeaways -->
    <section class="space-y-6 mt-[6rem] mb-[6rem]">
      <div>
        <h2 class="text-2xl font-semibold text-slate-900">Takeaways</h2>
        <p class="text-slate-600">
          Notes from building this chat experience with Go, Nuxt, and the OpenAI SDK.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2 text-slate-900">
              <UIcon name="i-lucide-puzzle" class="w-5 h-5" />
              <span class="font-medium">SDK Flexibility</span>
            </div>
          </template>
          <p class="text-slate-600">
            Integration with the Go SDK is straightforward but less flexible compared to the
            TypeScript AI SDK. The TS version still feels like the most adaptable option for rapid
            prototyping and feature parity.
          </p>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2 text-slate-900">
              <UIcon name="i-lucide-layers" class="w-5 h-5" />
              <span class="font-medium">Architecture Guidance</span>
            </div>
          </template>
          <p class="text-slate-600">
            The SDK repository lacks guidance on clean architecture patterns. Moving the client into
            a service layer with clear abstractions keeps the codebase easier to evolve and test.
          </p>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2 text-slate-900">
              <UIcon name="i-lucide-message-square-text" class="w-5 h-5" />
              <span class="font-medium">UI Message Shape</span>
            </div>
          </template>
          <p class="text-slate-600">
            UI libraries often expect message-specific structures. Adapting responses with a `parts`
            array (mirroring the AI SDK) makes it easier to plug into Nuxt UI components without
            bespoke renderers.
          </p>
        </UCard>
      </div>
    </section>
  </div>
</template>
