import { ref, type Ref } from 'vue'
import type { Coffee, ChatMessage, ImageGenerationResponse } from '@/types/api-generated'

const API_BASE_URL = 'http://localhost:8080/api'

export function useApi() {
  const loading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

  const getCoffee = async (): Promise<Coffee | null> => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/coffee`)
      const result = await response.json()
      return result.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch coffee counter'
      return null
    } finally {
      loading.value = false
    }
  }

  const incrementCoffee = async (): Promise<Coffee | null> => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/coffee/increment`, {
        method: 'POST',
      })
      const result = await response.json()
      return result.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to increment coffee counter'
      return null
    } finally {
      loading.value = false
    }
  }

  const sendChatMessage = async (
    messages: ChatMessage[],
    prompt: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ messages, prompt }),
      })

      if (!response.ok) {
        let message = 'Failed to send message'
        try {
          const errorData = await response.json()
          if (errorData?.error) {
            message = errorData.error
          }
        } catch {
          // ignore JSON parse errors
        }
        onError(message)
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (!reader) {
        onError('Failed to read response')
        return
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        let boundaryIndex = buffer.indexOf('\n\n')
        while (boundaryIndex !== -1) {
          const rawEvent = buffer.slice(0, boundaryIndex)
          buffer = buffer.slice(boundaryIndex + 2)

          const dataLines = rawEvent
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.replace(/^data:\s?/, ''))
            .join('\n')

          if (dataLines.trim()) {
            onChunk(dataLines)
          }

          boundaryIndex = buffer.indexOf('\n\n')
        }
      }

      // Flush any remaining buffered data
      buffer += decoder.decode()
      if (buffer.trim()) {
        const dataLines = buffer
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.replace(/^data:\s?/, ''))
          .join('\n')
        if (dataLines.trim()) {
          onChunk(dataLines)
        }
      }

      onComplete()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }

  const generateImage = async (prompt: string): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        console.error('Failed to generate image')
        return null
      }

      const result: ImageGenerationResponse = await response.json()
      return result.image_url
    } catch (err) {
      console.error('Error generating image:', err)
      return null
    }
  }

  return {
    loading,
    error,
    getCoffee,
    incrementCoffee,
    sendChatMessage,
    generateImage,
  }
}
