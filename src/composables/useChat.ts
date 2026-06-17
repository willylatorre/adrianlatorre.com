import { ref } from 'vue'
import type { ChatMessage } from '@/types/api-generated'
import { useApi } from './useApi'

type ChatRole = 'assistant' | 'user' | 'system'

type MessagePart = { type: 'text'; text: string } | { type: 'image'; url: string; alt?: string }

type UIChatMessage = Omit<ChatMessage, 'role'> & {
  role: ChatRole
  parts: MessagePart[]
}

const createTextPart = (text: string): MessagePart => ({ type: 'text' as const, text })
const createImagePart = (url: string, alt?: string): MessagePart => ({
  type: 'image' as const,
  url,
  alt,
})

const ensureFirstPart = (message: UIChatMessage) => {
  if (!message.parts.length) {
    message.parts.push(createTextPart(''))
  }
  return message.parts[0]
}

export function useChat() {
  const { sendChatMessage, generateImage } = useApi()

  const messages = ref<UIChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hey there! 👋 I'm Adrian Latorre, and I'm excited to chat with you today. Feel free to ask me anything about my life, experiences, career, hobbies, or whatever you're curious about. What would you like to know?",
      parts: [
        createTextPart(
          "Hey there! 👋 I'm Adrian Latorre, and I'm excited to chat with you today. Feel free to ask me anything about my life, experiences, career, hobbies, or whatever you're curious about. What would you like to know?",
        ),
      ],
      timestamp: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: '2',
      role: 'assistant',
      content: ' ',
      parts: [createImagePart('/interview-prompt.png')],
      timestamp: new Date(Date.now() - 60000).toISOString(),
    },
  ])

  const status = ref<'ready' | 'submitted' | 'streaming' | 'error'>('ready')
  const currentAssistantMessage = ref('')

  const sendMessage = async (prompt: string): Promise<void> => {
    if (!prompt.trim()) return

    // Clone current history before adding the new user message
    const history: ChatMessage[] = messages.value.map(({ id, role, content, timestamp }) => ({
      id,
      role,
      content,
      timestamp,
    }))

    // Add user message
    const userMessage: UIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      parts: [createTextPart(prompt)],
      timestamp: new Date().toISOString(),
    }
    messages.value.push(userMessage)

    // Prepare assistant message
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: UIChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      parts: [createTextPart('')],
      timestamp: new Date().toISOString(),
    }

    const assistantTextPart = ensureFirstPart(assistantMessage) as { type: 'text'; text: string }

    messages.value.push(assistantMessage)
    currentAssistantMessage.value = ''
    status.value = 'submitted'

    // Send message and stream response
    await sendChatMessage(
      history,
      prompt,
      (chunk: string) => {
        // Append chunk to current message
        console.log('📦 Chunk received:', chunk)
        status.value = 'streaming'
        currentAssistantMessage.value += chunk
        assistantMessage.content = currentAssistantMessage.value
        // Update the text part and trigger reactivity
        assistantMessage.parts = [createTextPart(currentAssistantMessage.value)]
      },
      async () => {
        // Streaming complete
        console.log('🎉 Streaming complete!')
        const finalContent = currentAssistantMessage.value
        console.log('📝 Final content:', finalContent)
        currentAssistantMessage.value = ''

        // Add system message indicating image generation
        if (finalContent.trim()) {
          console.log('🖼️ Starting image generation...')
          const imageGenMessage: UIChatMessage = {
            id: (Date.now() + 2).toString(),
            role: 'system',
            content: 'Generating an image to illustrate...',
            parts: [createTextPart('Generating an image to illustrate...')],
            timestamp: new Date().toISOString(),
          }
          messages.value.push(imageGenMessage)
          console.log('✅ System message added:', imageGenMessage)

          // Generate image
          const imageUrl = await generateImage(finalContent)
          console.log('🎨 Image URL:', imageUrl)

          // Update system message with image or error
          if (imageUrl) {
            // Force reactivity by finding and updating the message in the array
            const msgIndex = messages.value.findIndex((m) => m.id === imageGenMessage.id)
            if (msgIndex !== -1) {
              messages.value[msgIndex] = {
                ...imageGenMessage,
                content: '',
                parts: [createImagePart(imageUrl, 'Generated illustration')],
              }
            }
            console.log('✅ Image part added')
          } else {
            const msgIndex = messages.value.findIndex((m) => m.id === imageGenMessage.id)
            if (msgIndex !== -1) {
              messages.value[msgIndex] = {
                ...imageGenMessage,
                content: 'Could not generate image',
                parts: [createTextPart('Could not generate image')],
              }
            }
            console.log('❌ Image generation failed')
          }
        } else {
          console.log('⚠️ No content to generate image from')
        }
        status.value = 'ready'
      },
      (error: string) => {
        // Error occurred
        status.value = 'error'
        assistantMessage.content = `Error: ${error}`
        if (assistantTextPart) {
          assistantTextPart.text = `Error: ${error}`
        }
      },
    )
  }

  const clearMessages = () => {
    messages.value = []
  }

  return {
    messages,
    status,
    sendMessage,
    clearMessages,
  }
}
