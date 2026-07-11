import { ref, type Ref } from 'vue'
import type { ChatMessage, ImageGenerationResponse } from '@/types/api-generated'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

type StreamEvent = {
  event: string
  data: string
}

const parseSseEvent = (rawEvent: string): StreamEvent | null => {
  let event = 'message'
  const data: string[] = []

  for (const line of rawEvent.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue

    const separatorIndex = line.indexOf(':')
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex)
    const value = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1).replace(/^ /, '')

    if (field === 'event') event = value
    if (field === 'data') data.push(value)
  }

  if (!data.length) return null
  return { event, data: data.join('\n') }
}

const readSseStream = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
) => {
  const decoder = new TextDecoder()
  let buffer = ''

  const drainEvents = () => {
    let boundaryIndex = buffer.indexOf('\n\n')

    while (boundaryIndex !== -1) {
      const event = parseSseEvent(buffer.slice(0, boundaryIndex))
      if (event) onEvent(event)

      buffer = buffer.slice(boundaryIndex + 2)
      boundaryIndex = buffer.indexOf('\n\n')
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    drainEvents()
  }

  buffer += decoder.decode()
  if (buffer.trim()) {
    const event = parseSseEvent(buffer)
    if (event) onEvent(event)
  }
}

export function useApi() {
  const loading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

  const sendChatMessage = async (
    messages: ChatMessage[],
    prompt: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
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
      if (!reader) {
        onError('Failed to read response')
        return
      }

      await readSseStream(reader, ({ data }) => onChunk(data))
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

  const sendOrchestratorMessage = async (
    prompt: string,
    onEvent: (event: StreamEvent) => void,
    onComplete: () => void,
    onError: (error: string) => void,
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/orchestrator/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        onError('Failed to run orchestrator')
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        onError('Failed to read orchestrator stream')
        return
      }

      await readSseStream(reader, onEvent)
      onComplete()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unknown orchestrator error')
    }
  }

  return {
    loading,
    error,
    sendChatMessage,
    generateImage,
    sendOrchestratorMessage,
  }
}
