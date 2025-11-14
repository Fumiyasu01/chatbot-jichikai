/**
 * API Utilities for Next.js App Router
 *
 * This module provides type-safe helpers for building API routes with:
 * - Consistent response formatting
 * - Automatic authentication
 * - Unified error handling
 *
 * @module lib/api
 */

// Response helpers
export {
  ApiResponse,
  success,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  tooManyRequests,
  internalError,
} from './response-helpers'
export type { ApiSuccessResponse, ApiErrorResponse } from '@/lib/types'

// Authentication helpers
export {
  withAuth,
  withSuperAdmin,
  isSuperAdmin,
  isAuthenticated,
} from './with-auth'
export type { AuthContext, AuthenticatedHandler } from './with-auth'

// Error handling
export {
  ErrorType,
  ApiError,
  handleApiError,
  withErrorHandler,
  logError,
  toApiError,
  errorToResponse,
  throwApiError,
  throwValidationError,
  throwAuthError,
  throwForbiddenError,
  throwNotFoundError,
  throwRateLimitError,
} from './error-handler'
export type { ErrorHandlerOptions } from './error-handler'
