/**
 * Generic API types
 */

// Standard API error response
export interface ApiErrorResponse {
  error: string
  details?: unknown
}

// Standard API success response
export interface ApiSuccessResponse<T = unknown> {
  data?: T
  message?: string
}

// API response wrapper
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// Pagination params
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

// Pagination metadata
export interface PaginationMeta {
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

// Filter params
export interface FilterParams {
  search?: string
  startDate?: string
  endDate?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Common query params
export type QueryParams = PaginationParams & FilterParams
