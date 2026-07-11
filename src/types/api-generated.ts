// Kept in sync with FastAPI models in server/models.py.
/**
 * API contract consumed by the Vue client.
 *
 * For larger changes, use /api/openapi.json as the source of truth.
 */

//////////
// source: server/models.py

/**
 * ChatMessage represents a message in a chat conversation
 */
export interface ChatMessage {
  id: string
  role: string
  content: string
  timestamp: string
}
/**
 * ChatRequest represents the incoming chat request from the client
 */
export interface ChatRequest {
  messages: ChatMessage[]
  prompt: string
}
/**
 * ChatResponse represents a streaming chunk from the AI
 */
export interface ChatResponse {
  chunk: string
}
/**
 * ImageGenerationRequest represents a request to generate an image
 */
export interface ImageGenerationRequest {
  prompt: string
}
/**
 * ImageGenerationResponse represents the response from image generation
 */
export interface ImageGenerationResponse {
  image_url: string
}
/**
 * OrchestratorRequest represents a single-turn agent orchestration prompt
 */
export interface OrchestratorRequest {
  prompt: string
}
