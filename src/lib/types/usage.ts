/**
 * Usage tracking types
 */

// Event types
export type UsageEventType = 'chat' | 'upload' | 'embedding'

// Usage log parameters
export interface UsageLogParams {
  roomId: string
  eventType: UsageEventType
  tokensUsed?: number
  fileName?: string
  chunkCount?: number
  metadata?: Record<string, unknown>
}

// Usage summary
export interface UsageSummary {
  total_events: number
  total_tokens: number
  total_cost: number
  chat_count: number
  upload_count: number
  embedding_count: number
}

// Usage log entry
export interface UsageLogEntry {
  id: string
  room_id: string
  event_type: UsageEventType
  tokens_used: number
  file_name: string | null
  chunk_count: number
  cost_usd: number
  metadata: Record<string, unknown>
  created_at: string
}

// Usage response
export interface UsageResponse {
  summary: UsageSummary
  recent_usage: UsageLogEntry[]
  period_days: number
}

// OpenAI pricing
export interface ModelPricing {
  input: number
  output?: number
}

export interface PricingConfig {
  [model: string]: ModelPricing
}
