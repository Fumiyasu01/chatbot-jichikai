/**
 * File-related types
 */
import { ProcessingStatus } from './database'

// File metadata (returned from API)
export interface FileMetadata {
  id: string
  file_name: string
  file_size: number
  mime_type: string
  processing_status: ProcessingStatus
  error_message: string | null
  chunk_count: number
  processed_chunks: number
  created_at: string
  updated_at: string
}

// File list response
export interface FileListResponse {
  files: FileMetadata[]
}

// File upload response
export interface FileUploadResponse {
  message: string
  file_id: string
  file_name: string
  file_size: number
  processing_status: ProcessingStatus
}

// Process embeddings request
export interface ProcessEmbeddingsRequest {
  fileId: string
}

// Process embeddings response
export interface ProcessEmbeddingsResponse {
  message: string
  status: ProcessingStatus
  progress: {
    processed: number
    total: number
  }
}

// File processing progress
export interface FileProcessingProgress {
  processed: number
  total: number
  percentage: number
}
