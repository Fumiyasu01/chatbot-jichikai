/**
 * Document-related types
 */

// Document with similarity score (from vector search)
export interface DocumentWithSimilarity {
  id: string
  content: string
  file_name: string
  similarity: number
}

// Document with combined search scores (from hybrid search)
export interface DocumentWithHybridScore extends DocumentWithSimilarity {
  keyword_rank?: number
  combined_score?: number
}

// Document chunk
export interface DocumentChunk {
  id: string
  room_id: string
  file_id: string | null
  file_name: string
  content: string
  embedding: number[] | null
  created_at: string
}

// Source reference (used in chat responses)
export interface SourceReference {
  file_name: string
  similarity: number
}

// Grouped sources (for UI display)
export interface GroupedSources {
  [fileName: string]: number[]
}
