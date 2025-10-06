import { supabaseAdmin } from './supabase/admin'

// OpenAI pricing (as of 2024)
const PRICING = {
  'gpt-4o-mini': {
    input: 0.15 / 1_000_000,  // $0.15 per 1M tokens
    output: 0.60 / 1_000_000, // $0.60 per 1M tokens
  },
  'text-embedding-3-small': {
    input: 0.02 / 1_000_000,  // $0.02 per 1M tokens
  },
}

interface UsageLogParams {
  roomId: string
  eventType: 'chat' | 'upload' | 'embedding'
  tokensUsed?: number
  fileName?: string
  chunkCount?: number
  metadata?: Record<string, any>
}

/**
 * Log usage event to database
 */
export async function logUsage(params: UsageLogParams) {
  const {
    roomId,
    eventType,
    tokensUsed = 0,
    fileName,
    chunkCount = 0,
    metadata = {},
  } = params

  // Calculate cost based on event type
  let costUsd = 0
  if (eventType === 'chat' && tokensUsed > 0) {
    // Estimate: 70% input, 30% output
    const inputTokens = Math.floor(tokensUsed * 0.7)
    const outputTokens = Math.floor(tokensUsed * 0.3)
    costUsd = (
      inputTokens * PRICING['gpt-4o-mini'].input +
      outputTokens * PRICING['gpt-4o-mini'].output
    )
  } else if (eventType === 'embedding' && tokensUsed > 0) {
    costUsd = tokensUsed * PRICING['text-embedding-3-small'].input
  }

  try {
    const { error } = await (supabaseAdmin.from('usage_logs') as any).insert({
      room_id: roomId,
      event_type: eventType,
      tokens_used: tokensUsed,
      file_name: fileName,
      chunk_count: chunkCount,
      cost_usd: costUsd,
      metadata,
    })

    if (error) {
      console.error('Failed to log usage:', error)
    }
  } catch (error) {
    console.error('Usage logging error:', error)
  }
}

/**
 * Estimate tokens for text (rough approximation)
 * OpenAI uses ~4 characters per token
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Get usage summary for a room
 */
export async function getUsageSummary(
  roomId: string,
  startDate?: Date,
  endDate?: Date
) {
  const start = startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const end = endDate?.toISOString() || new Date().toISOString()

  try {
    const { data, error } = await (supabaseAdmin.rpc as any)('get_room_usage_summary', {
      target_room_id: roomId,
      start_date: start,
      end_date: end,
    })

    if (error) {
      console.error('Failed to get usage summary:', error)
      // Return zero values if function doesn't exist yet
      return {
        total_events: 0,
        total_tokens: 0,
        total_cost: 0,
        chat_count: 0,
        upload_count: 0,
        embedding_count: 0,
      }
    }

    return data?.[0] || {
      total_events: 0,
      total_tokens: 0,
      total_cost: 0,
      chat_count: 0,
      upload_count: 0,
      embedding_count: 0,
    }
  } catch (error) {
    console.error('Usage summary error:', error)
    return {
      total_events: 0,
      total_tokens: 0,
      total_cost: 0,
      chat_count: 0,
      upload_count: 0,
      embedding_count: 0,
    }
  }
}

/**
 * Get recent usage logs
 */
export async function getRecentUsage(roomId: string, limit: number = 100) {
  const { data, error } = await supabaseAdmin
    .from('usage_logs')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to get recent usage:', error)
    return []
  }

  return data || []
}
