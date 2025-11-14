/**
 * Chat-related types
 */
import { SourceReference } from './document'

// Chat message
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: SourceReference[]
}

// Chat request
export interface ChatRequest {
  message: string
  roomId: string
  stream?: boolean
}

// Chat response (non-streaming)
export interface ChatResponse {
  answer: string
  sources: SourceReference[]
}

// Streaming message types
export type StreamMessageType = 'metadata' | 'content' | 'done' | 'error'

export interface StreamMetadataMessage {
  type: 'metadata'
  sources: SourceReference[]
}

export interface StreamContentMessage {
  type: 'content'
  content: string
}

export interface StreamDoneMessage {
  type: 'done'
}

export interface StreamErrorMessage {
  type: 'error'
  error: string
}

export type StreamMessage =
  | StreamMetadataMessage
  | StreamContentMessage
  | StreamDoneMessage
  | StreamErrorMessage

// OpenAI-related types
export interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[]
    index: number
  }>
  usage?: {
    prompt_tokens: number
    total_tokens: number
  }
}

export interface OpenAIChatCompletionResponse {
  choices: Array<{
    message?: {
      content: string | null
    }
    delta?: {
      content?: string
    }
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
