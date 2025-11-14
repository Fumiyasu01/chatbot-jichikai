/**
 * Type definitions for the chatbot application
 *
 * This module provides a centralized location for all type definitions
 * used throughout the application, eliminating the use of 'any' types
 * and improving type safety.
 */

// Database types (from Supabase)
export type {
  Room,
  RoomInsert,
  RoomUpdate,
  Document,
  DocumentInsert,
  DocumentUpdate,
  File,
  FileInsert,
  FileUpdate,
  ProcessingStatus,
  MatchedDocument,
} from './database'

// Room types
export type {
  RoomDisplay,
  CreateRoomRequest,
  UpdateRoomRequest,
  CreateRoomResponse,
  RoomListResponse,
  RoomDetailsResponse,
} from './room'

// File types
export type {
  FileMetadata,
  FileListResponse,
  FileUploadResponse,
  ProcessEmbeddingsRequest,
  ProcessEmbeddingsResponse,
  FileProcessingProgress,
} from './file'

// Document types
export type {
  DocumentWithSimilarity,
  DocumentWithHybridScore,
  DocumentChunk,
  SourceReference,
  GroupedSources,
} from './document'

// Chat types
export type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  StreamMessageType,
  StreamMetadataMessage,
  StreamContentMessage,
  StreamDoneMessage,
  StreamErrorMessage,
  StreamMessage,
  OpenAIEmbeddingResponse,
  OpenAIChatCompletionResponse,
} from './chat'

// Auth types
export type {
  SessionData,
  AuthResult,
  LoginRequest,
  LoginResponse,
  SessionResponse,
} from './auth'

// Usage tracking types
export type {
  UsageEventType,
  UsageLogParams,
  UsageSummary,
  UsageLogEntry,
  UsageResponse,
  ModelPricing,
  PricingConfig,
} from './usage'

// Generic API types
export type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ApiResponse,
  PaginationParams,
  PaginationMeta,
  PaginatedResponse,
  FilterParams,
  QueryParams,
} from './api'
