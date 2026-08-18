<script setup lang="ts">
import { ref } from 'vue'
import ExperimentFooter from '@/components/experiment/ExperimentFooter.vue'
import ExperimentHeader from '@/components/experiment/ExperimentHeader.vue'
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
  <div class="mx-auto max-w-6xl">
    <ExperimentHeader
      title="AI Interview"
      description="Interview an AI version of Adrian. Each streamed answer is paired with a generated pixel-art scene."
    />

    <!-- Chat Palette -->
    <div>
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

    <ExperimentFooter
      conclusion="A stable message-part shape makes streamed text and generated media predictable for the interface. The transport can evolve without forcing every chat component to understand backend details."
      :links="[
        {
          label: 'View the repository',
          href: 'https://github.com/willylatorre/adrianlatorre.com',
          external: true,
        },
        {
          label: 'OpenAI Python SDK',
          href: 'https://github.com/openai/openai-python',
          external: true,
        },
      ]"
    />
  </div>
</template>
