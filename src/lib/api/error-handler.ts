import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ApiResponse } from './response-helpers'

/**
 * Error types for better error handling
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  DATABASE = 'DATABASE_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
}

/**
 * Custom error class with type information
 */
export class ApiError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Error logger with context
 *
 * @param error - The error to log
 * @param context - Additional context (route, userId, etc)
 */
export function logError(error: Error | unknown, context?: Record<string, any>) {
  const timestamp = new Date().toISOString()
  const errorInfo = {
    timestamp,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    context,
  }

  // In production, you might want to send this to a logging service
  console.error('=== API ERROR ===', JSON.stringify(errorInfo, null, 2))
}

/**
 * Convert unknown errors to ApiError
 *
 * @param error - The error to convert
 * @returns ApiError instance
 */
export function toApiError(error: unknown): ApiError {
  // Already an ApiError
  if (error instanceof ApiError) {
    return error
  }

  // Zod validation error
  if (error instanceof ZodError) {
    return new ApiError(
      ErrorType.VALIDATION,
      '入力内容に誤りがあります',
      400,
      error.errors
    )
  }

  // OpenAI API errors (check by status property)
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const apiError = error as { status?: number; message?: string }

    if (apiError.status === 401) {
      return new ApiError(
        ErrorType.EXTERNAL_API,
        'APIキーが無効です',
        500
      )
    }

    if (apiError.status === 429) {
      return new ApiError(
        ErrorType.RATE_LIMIT,
        'APIの利用制限に達しました。しばらく待ってから再度お試しください',
        429
      )
    }
  }

  // Standard Error
  if (error instanceof Error) {
    return new ApiError(
      ErrorType.INTERNAL,
      error.message || '予期しないエラーが発生しました',
      500
    )
  }

  // Unknown error
  return new ApiError(
    ErrorType.INTERNAL,
    '予期しないエラーが発生しました',
    500
  )
}

/**
 * Convert ApiError to NextResponse
 *
 * @param error - The ApiError to convert
 * @returns NextResponse with appropriate error
 */
export function errorToResponse(error: ApiError): NextResponse {
  switch (error.type) {
    case ErrorType.VALIDATION:
      return ApiResponse.badRequest(error.message, error.details)

    case ErrorType.AUTHENTICATION:
      return ApiResponse.unauthorized(error.message)

    case ErrorType.AUTHORIZATION:
      return ApiResponse.forbidden(error.message)

    case ErrorType.NOT_FOUND:
      return ApiResponse.notFound(error.message)

    case ErrorType.RATE_LIMIT:
      return ApiResponse.tooManyRequests(error.message)

    case ErrorType.EXTERNAL_API:
    case ErrorType.DATABASE:
    case ErrorType.INTERNAL:
    default:
      return ApiResponse.internalError(error.message)
  }
}

/**
 * Options for error handler
 */
export interface ErrorHandlerOptions {
  /** Log errors to console (default: true) */
  logErrors?: boolean
  /** Additional context to log with errors */
  context?: Record<string, any>
  /** Custom error transformer */
  transformError?: (error: unknown) => ApiError
}

/**
 * Unified error handler for API routes
 * Wraps try-catch logic and returns appropriate responses
 *
 * @param handler - The async function to wrap
 * @param options - Error handling options
 * @returns Promise that resolves to NextResponse
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return handleApiError(async () => {
 *     // Your logic here
 *     const data = await fetchData()
 *     return ApiResponse.success(data)
 *   })
 * }
 *
 * // With validation
 * export async function POST(request: NextRequest) {
 *   return handleApiError(async () => {
 *     const body = await request.json()
 *     const validated = someSchema.parse(body) // Zod validation
 *
 *     const result = await createResource(validated)
 *     return ApiResponse.success(result, 'Created successfully')
 *   }, {
 *     context: { route: 'POST /api/resource' }
 *   })
 * }
 * ```
 */
export async function handleApiError<T = any>(
  handler: () => Promise<NextResponse<T>>,
  options: ErrorHandlerOptions = {}
): Promise<NextResponse<T>> {
  const {
    logErrors = true,
    context,
    transformError = toApiError,
  } = options

  try {
    return await handler()
  } catch (error) {
    // Log error with context
    if (logErrors) {
      logError(error, context)
    }

    // Transform to ApiError
    const apiError = transformError(error)

    // Return appropriate response
    return errorToResponse(apiError) as NextResponse<T>
  }
}

/**
 * Higher-order function that wraps handlers with error handling
 *
 * @param handler - The route handler to wrap
 * @param options - Error handling options
 * @returns Wrapped handler with automatic error handling
 *
 * @example
 * ```typescript
 * export const GET = withErrorHandler(
 *   async (request) => {
 *     const data = await fetchData()
 *     return ApiResponse.success(data)
 *   },
 *   { context: { route: 'GET /api/data' } }
 * )
 * ```
 */
export function withErrorHandler<T = any>(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse<T>>,
  options: ErrorHandlerOptions = {}
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse<T>> => {
    return handleApiError(
      () => handler(request, ...args),
      options
    )
  }
}

/**
 * Throw a typed API error
 * Use this to trigger specific error responses
 *
 * @example
 * ```typescript
 * if (!user) {
 *   throw throwApiError(ErrorType.NOT_FOUND, 'ユーザーが見つかりませんでした')
 * }
 * ```
 */
export function throwApiError(
  type: ErrorType,
  message: string,
  statusCode?: number,
  details?: any
): never {
  throw new ApiError(type, message, statusCode, details)
}

/**
 * Convenience functions for throwing specific errors
 */
export const throwValidationError = (message: string, details?: any) =>
  throwApiError(ErrorType.VALIDATION, message, 400, details)

export const throwAuthError = (message = '認証に失敗しました') =>
  throwApiError(ErrorType.AUTHENTICATION, message, 401)

export const throwForbiddenError = (message = 'アクセス権がありません') =>
  throwApiError(ErrorType.AUTHORIZATION, message, 403)

export const throwNotFoundError = (message = 'リソースが見つかりませんでした') =>
  throwApiError(ErrorType.NOT_FOUND, message, 404)

export const throwRateLimitError = (
  message = 'APIの利用制限に達しました。しばらく待ってから再度お試しください'
) => throwApiError(ErrorType.RATE_LIMIT, message, 429)
