import { NextResponse } from 'next/server'
import type { ApiSuccessResponse, ApiErrorResponse } from '@/lib/types'

/**
 * ApiResponse class provides standardized response helpers for API routes
 *
 * @example
 * ```typescript
 * // Success response
 * return ApiResponse.success({ user: { id: 1 } })
 *
 * // Success with message
 * return ApiResponse.success({ file_id: 123 }, 'ファイルをアップロードしました')
 *
 * // Error responses
 * return ApiResponse.error('Invalid request', 400)
 * return ApiResponse.unauthorized('認証に失敗しました')
 * return ApiResponse.notFound('ルームが見つかりませんでした')
 * return ApiResponse.forbidden('このルームへのアクセス権がありません')
 * ```
 */
export class ApiResponse {
  /**
   * Create a successful response (200 OK)
   *
   * @param data - Response data object
   * @param message - Optional success message
   * @param status - HTTP status code (default: 200)
   * @returns NextResponse with successful status
   */
  static success<T = unknown>(
    data: T,
    message?: string,
    status = 200
  ): NextResponse {
    // Preserve existing behavior for backward compatibility
    // If message is provided, spread data properties along with message
    // Otherwise, return data as-is (it should already be an object)
    const response = message
      ? { message, ...(data as Record<string, unknown>) }
      : data

    return NextResponse.json(response, { status })
  }

  /**
   * Create an error response
   *
   * @param error - Error message
   * @param status - HTTP status code (default: 500)
   * @param details - Additional error details
   * @returns NextResponse with error status
   */
  static error(
    error: string,
    status = 500,
    details?: unknown
  ): NextResponse<ApiErrorResponse> {
    const response: ApiErrorResponse = { error }

    if (details !== undefined) {
      response.details = details
    }

    return NextResponse.json(response, { status })
  }

  /**
   * Create a bad request error response (400)
   *
   * @param error - Error message (default: '入力内容に誤りがあります')
   * @param details - Additional validation details
   * @returns NextResponse with 400 status
   */
  static badRequest(
    error = '入力内容に誤りがあります',
    details?: unknown
  ): NextResponse<ApiErrorResponse> {
    return ApiResponse.error(error, 400, details)
  }

  /**
   * Create an unauthorized error response (401)
   *
   * @param error - Error message (default: '認証に失敗しました')
   * @returns NextResponse with 401 status
   */
  static unauthorized(
    error = '認証に失敗しました'
  ): NextResponse<ApiErrorResponse> {
    return ApiResponse.error(error, 401)
  }

  /**
   * Create a forbidden error response (403)
   *
   * @param error - Error message (default: 'アクセス権がありません')
   * @returns NextResponse with 403 status
   */
  static forbidden(
    error = 'アクセス権がありません'
  ): NextResponse<ApiErrorResponse> {
    return ApiResponse.error(error, 403)
  }

  /**
   * Create a not found error response (404)
   *
   * @param error - Error message (default: 'リソースが見つかりませんでした')
   * @returns NextResponse with 404 status
   */
  static notFound(
    error = 'リソースが見つかりませんでした'
  ): NextResponse<ApiErrorResponse> {
    return ApiResponse.error(error, 404)
  }

  /**
   * Create a rate limit error response (429)
   *
   * @param error - Error message (default: 'APIの利用制限に達しました。しばらく待ってから再度お試しください')
   * @returns NextResponse with 429 status
   */
  static tooManyRequests(
    error = 'APIの利用制限に達しました。しばらく待ってから再度お試しください'
  ): NextResponse<ApiErrorResponse> {
    return ApiResponse.error(error, 429)
  }

  /**
   * Create an internal server error response (500)
   *
   * @param error - Error message (default: '予期しないエラーが発生しました')
   * @returns NextResponse with 500 status
   */
  static internalError(
    error = '予期しないエラーが発生しました'
  ): NextResponse<ApiErrorResponse> {
    return ApiResponse.error(error, 500)
  }
}

/**
 * Convenience functions for common responses
 * Can be used as standalone functions if preferred
 */
export const success = ApiResponse.success
export const error = ApiResponse.error
export const badRequest = ApiResponse.badRequest
export const unauthorized = ApiResponse.unauthorized
export const forbidden = ApiResponse.forbidden
export const notFound = ApiResponse.notFound
export const tooManyRequests = ApiResponse.tooManyRequests
export const internalError = ApiResponse.internalError
