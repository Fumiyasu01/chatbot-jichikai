import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { ApiResponse } from './response-helpers'

/**
 * Authenticated request context with admin key
 */
export interface AuthContext {
  adminKey: string
  isAuthenticated: true
}

/**
 * Route handler type with authentication context
 */
export type AuthenticatedHandler<T = unknown> = (
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> },
  auth: AuthContext
) => Promise<NextResponse<T>>

/**
 * Higher-order function that wraps API route handlers with authentication
 *
 * This function:
 * - Automatically checks authentication using requireAuth
 * - Extracts roomId from params
 * - Returns 401 responses for unauthorized requests
 * - Passes authenticated context to the handler
 *
 * @param handler - The authenticated route handler to wrap
 * @returns Wrapped handler with authentication
 *
 * @example
 * ```typescript
 * // Basic usage
 * export const GET = withAuth(async (request, { params }, auth) => {
 *   const { roomId } = await params
 *   // Auth is already verified, auth.adminKey is available
 *   return ApiResponse.success({ message: 'Authenticated!' })
 * })
 *
 * // With dynamic route params
 * export const POST = withAuth(async (request, { params }, auth) => {
 *   const { roomId } = await params
 *   const body = await request.json()
 *
 *   // Your authenticated logic here
 *   return ApiResponse.success({ data: 'Created' }, 'Success!')
 * })
 * ```
 */
export function withAuth<T = unknown>(
  handler: AuthenticatedHandler<T>
): (
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) => Promise<NextResponse<T>> {
  return async (
    request: NextRequest,
    context: { params: Promise<{ roomId: string }> }
  ) => {
    try {
      // Extract roomId from params
      const { roomId } = await context.params

      // Verify authentication
      const auth = await requireAuth(request, roomId)

      if (!auth.authenticated) {
        return ApiResponse.unauthorized(
          auth.error || '認証に失敗しました'
        ) as NextResponse<T>
      }

      // Create authenticated context
      const authContext: AuthContext = {
        adminKey: auth.adminKey!,
        isAuthenticated: true,
      }

      // Call the handler with authenticated context
      return await handler(request, context, authContext)
    } catch (error) {
      console.error('withAuth error:', error)
      return ApiResponse.internalError() as NextResponse<T>
    }
  }
}

/**
 * Super admin authentication check
 *
 * @param request - NextRequest object
 * @returns true if request is from super admin
 */
export function isSuperAdmin(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key')
  return adminKey === process.env.SUPER_ADMIN_KEY
}

/**
 * Higher-order function that requires super admin authentication
 *
 * @param handler - The route handler to wrap
 * @returns Wrapped handler with super admin check
 *
 * @example
 * ```typescript
 * export const DELETE = withSuperAdmin(async (request) => {
 *   // Only super admin can access this
 *   return ApiResponse.success({ message: 'Deleted' })
 * })
 * ```
 */
export function withSuperAdmin<T = unknown>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>
): (request: NextRequest) => Promise<NextResponse<T>> {
  return async (request: NextRequest) => {
    try {
      if (!isSuperAdmin(request)) {
        return ApiResponse.unauthorized('認証に失敗しました') as NextResponse<T>
      }

      return await handler(request)
    } catch (error) {
      console.error('withSuperAdmin error:', error)
      return ApiResponse.internalError() as NextResponse<T>
    }
  }
}

/**
 * Type guard to check if authentication context is valid
 *
 * @param auth - Authentication result from requireAuth
 * @returns true if authenticated
 */
export function isAuthenticated(
  auth: { authenticated: boolean; adminKey?: string; error?: string }
): auth is { authenticated: true; adminKey: string } {
  return auth.authenticated && !!auth.adminKey
}
