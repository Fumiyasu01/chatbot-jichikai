import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { ZodError, z } from 'zod'
import {
  ErrorType,
  ApiError,
  logError,
  toApiError,
  errorToResponse,
  handleApiError,
  withErrorHandler,
  throwApiError,
  throwValidationError,
  throwAuthError,
  throwForbiddenError,
  throwNotFoundError,
  throwRateLimitError,
} from '../error-handler'

describe('ApiError', () => {
  it('should create an ApiError with all properties', () => {
    const error = new ApiError(
      ErrorType.VALIDATION,
      'Invalid input',
      400,
      { field: 'email' }
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.name).toBe('ApiError')
    expect(error.type).toBe(ErrorType.VALIDATION)
    expect(error.message).toBe('Invalid input')
    expect(error.statusCode).toBe(400)
    expect(error.details).toEqual({ field: 'email' })
  })

  it('should have default status code of 500', () => {
    const error = new ApiError(ErrorType.INTERNAL, 'Internal error')

    expect(error.statusCode).toBe(500)
  })
})

describe('logError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should log Error instances with stack trace', () => {
    const error = new Error('Test error')
    const context = { route: '/api/test', userId: '123' }

    logError(error, context)

    expect(console.error).toHaveBeenCalledWith(
      '=== API ERROR ===',
      expect.stringContaining('Test error')
    )
  })

  it('should log unknown errors', () => {
    const error = 'String error'
    const context = { route: '/api/test' }

    logError(error, context)

    expect(console.error).toHaveBeenCalledWith(
      '=== API ERROR ===',
      expect.any(String)
    )
  })

  it('should work without context', () => {
    const error = new Error('No context error')

    logError(error)

    expect(console.error).toHaveBeenCalled()
  })
})

describe('toApiError', () => {
  it('should return ApiError as-is', () => {
    const originalError = new ApiError(ErrorType.VALIDATION, 'Test', 400)
    const result = toApiError(originalError)

    expect(result).toBe(originalError)
    expect(result.type).toBe(ErrorType.VALIDATION)
  })

  it('should convert ZodError to ApiError', () => {
    const schema = z.object({
      email: z.string().email(),
    })

    try {
      schema.parse({ email: 'invalid' })
    } catch (zodError) {
      const result = toApiError(zodError)

      expect(result).toBeInstanceOf(ApiError)
      expect(result.type).toBe(ErrorType.VALIDATION)
      expect(result.statusCode).toBe(400)
      expect(result.message).toBe('入力内容に誤りがあります')
      expect(result.details).toBeDefined()
      expect(Array.isArray(result.details)).toBe(true)
    }
  })

  it('should convert 401 external API error', () => {
    const apiError = { status: 401, message: 'Unauthorized' }
    const result = toApiError(apiError)

    expect(result.type).toBe(ErrorType.EXTERNAL_API)
    expect(result.message).toBe('APIキーが無効です')
    expect(result.statusCode).toBe(500)
  })

  it('should convert 429 rate limit error', () => {
    const apiError = { status: 429, message: 'Too many requests' }
    const result = toApiError(apiError)

    expect(result.type).toBe(ErrorType.RATE_LIMIT)
    expect(result.statusCode).toBe(429)
    expect(result.message).toBe('APIの利用制限に達しました。しばらく待ってから再度お試しください')
  })

  it('should convert standard Error to ApiError', () => {
    const error = new Error('Standard error')
    const result = toApiError(error)

    expect(result.type).toBe(ErrorType.INTERNAL)
    expect(result.message).toBe('Standard error')
    expect(result.statusCode).toBe(500)
  })

  it('should handle Error with empty message', () => {
    const error = new Error('')
    const result = toApiError(error)

    expect(result.message).toBe('予期しないエラーが発生しました')
  })

  it('should convert unknown errors to ApiError', () => {
    const result = toApiError('unknown error')

    expect(result.type).toBe(ErrorType.INTERNAL)
    expect(result.statusCode).toBe(500)
    expect(result.message).toBe('予期しないエラーが発生しました')
  })

  it('should handle null error', () => {
    const result = toApiError(null)

    expect(result.type).toBe(ErrorType.INTERNAL)
    expect(result.statusCode).toBe(500)
  })
})

describe('errorToResponse', () => {
  it('should convert VALIDATION error to 400 response', async () => {
    const error = new ApiError(ErrorType.VALIDATION, 'Validation failed', 400, { field: 'email' })
    const response = errorToResponse(error)

    expect(response.status).toBe(400)

    const json = await response.json()
    expect(json.error).toBe('Validation failed')
    expect(json.details).toEqual({ field: 'email' })
  })

  it('should convert AUTHENTICATION error to 401 response', async () => {
    const error = new ApiError(ErrorType.AUTHENTICATION, 'Not authenticated', 401)
    const response = errorToResponse(error)

    expect(response.status).toBe(401)

    const json = await response.json()
    expect(json.error).toBe('Not authenticated')
  })

  it('should convert AUTHORIZATION error to 403 response', async () => {
    const error = new ApiError(ErrorType.AUTHORIZATION, 'Forbidden', 403)
    const response = errorToResponse(error)

    expect(response.status).toBe(403)

    const json = await response.json()
    expect(json.error).toBe('Forbidden')
  })

  it('should convert NOT_FOUND error to 404 response', async () => {
    const error = new ApiError(ErrorType.NOT_FOUND, 'Resource not found', 404)
    const response = errorToResponse(error)

    expect(response.status).toBe(404)

    const json = await response.json()
    expect(json.error).toBe('Resource not found')
  })

  it('should convert RATE_LIMIT error to 429 response', async () => {
    const error = new ApiError(ErrorType.RATE_LIMIT, 'Rate limit exceeded', 429)
    const response = errorToResponse(error)

    expect(response.status).toBe(429)

    const json = await response.json()
    expect(json.error).toBe('Rate limit exceeded')
  })

  it('should convert EXTERNAL_API error to 500 response', async () => {
    const error = new ApiError(ErrorType.EXTERNAL_API, 'External API failed', 500)
    const response = errorToResponse(error)

    expect(response.status).toBe(500)

    const json = await response.json()
    expect(json.error).toBe('External API failed')
  })

  it('should convert DATABASE error to 500 response', async () => {
    const error = new ApiError(ErrorType.DATABASE, 'Database error', 500)
    const response = errorToResponse(error)

    expect(response.status).toBe(500)
  })

  it('should convert INTERNAL error to 500 response', async () => {
    const error = new ApiError(ErrorType.INTERNAL, 'Internal error', 500)
    const response = errorToResponse(error)

    expect(response.status).toBe(500)
  })
})

describe('handleApiError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should return handler result on success', async () => {
    const handler = async () => NextResponse.json({ success: true })
    const response = await handleApiError(handler)

    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json.success).toBe(true)
  })

  it('should catch and convert errors', async () => {
    const handler = async () => {
      throw new Error('Test error')
    }

    const response = await handleApiError(handler)

    expect(response.status).toBe(500)

    const json = await response.json()
    expect(json.error).toBe('Test error')
  })

  it('should log errors by default', async () => {
    const handler = async () => {
      throw new Error('Test error')
    }

    await handleApiError(handler)

    expect(console.error).toHaveBeenCalled()
  })

  it('should not log errors when disabled', async () => {
    vi.clearAllMocks() // Clear previous mocks
    const handler = async () => {
      throw new Error('Test error')
    }

    await handleApiError(handler, { logErrors: false })

    expect(console.error).not.toHaveBeenCalled()
  })

  it('should use custom context in logs', async () => {
    const handler = async () => {
      throw new Error('Test error')
    }

    const context = { route: '/api/test', userId: '123' }
    await handleApiError(handler, { context })

    expect(console.error).toHaveBeenCalledWith(
      '=== API ERROR ===',
      expect.stringContaining('route')
    )
  })

  it('should use custom error transformer', async () => {
    const handler = async () => {
      throw new Error('Test error')
    }

    const transformError = () => new ApiError(ErrorType.VALIDATION, 'Custom error', 400)

    const response = await handleApiError(handler, { transformError })

    expect(response.status).toBe(400)

    const json = await response.json()
    expect(json.error).toBe('Custom error')
  })

  it('should handle ApiError correctly', async () => {
    const handler = async () => {
      throw new ApiError(ErrorType.NOT_FOUND, 'Resource not found', 404)
    }

    const response = await handleApiError(handler)

    expect(response.status).toBe(404)

    const json = await response.json()
    expect(json.error).toBe('Resource not found')
  })

  it('should handle ZodError correctly', async () => {
    const handler = async () => {
      const schema = z.object({ email: z.string().email() })
      schema.parse({ email: 'invalid' })
      return NextResponse.json({ success: true })
    }

    const response = await handleApiError(handler)

    expect(response.status).toBe(400)

    const json = await response.json()
    expect(json.error).toBe('入力内容に誤りがあります')
    expect(json.details).toBeDefined()
  })
})

describe('withErrorHandler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should wrap handler and return success', async () => {
    const handler = async () => NextResponse.json({ success: true })
    const wrappedHandler = withErrorHandler(handler)

    const request = new NextRequest('http://localhost/api/test')
    const response = await wrappedHandler(request)

    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json.success).toBe(true)
  })

  it('should catch and convert errors', async () => {
    const handler = async () => {
      throw new Error('Test error')
    }
    const wrappedHandler = withErrorHandler(handler)

    const request = new NextRequest('http://localhost/api/test')
    const response = await wrappedHandler(request)

    expect(response.status).toBe(500)

    const json = await response.json()
    expect(json.error).toBe('Test error')
  })

  it('should pass request and additional args to handler', async () => {
    const handler = async (request: NextRequest, params: { id: string }) => {
      return NextResponse.json({ id: params.id })
    }
    const wrappedHandler = withErrorHandler(handler)

    const request = new NextRequest('http://localhost/api/test/123')
    const response = await wrappedHandler(request, { id: '123' })

    const json = await response.json()
    expect(json.id).toBe('123')
  })

  it('should apply error handler options', async () => {
    vi.clearAllMocks() // Clear previous mocks
    const handler = async () => {
      throw new Error('Test error')
    }
    const wrappedHandler = withErrorHandler(handler, {
      logErrors: false,
      context: { route: '/api/test' },
    })

    const request = new NextRequest('http://localhost/api/test')
    await wrappedHandler(request)

    expect(console.error).not.toHaveBeenCalled()
  })
})

describe('throwApiError', () => {
  it('should throw ApiError', () => {
    expect(() => {
      throwApiError(ErrorType.VALIDATION, 'Invalid input', 400)
    }).toThrow(ApiError)
  })

  it('should throw with correct properties', () => {
    try {
      throwApiError(ErrorType.NOT_FOUND, 'Resource not found', 404, { id: '123' })
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      if (error instanceof ApiError) {
        expect(error.type).toBe(ErrorType.NOT_FOUND)
        expect(error.message).toBe('Resource not found')
        expect(error.statusCode).toBe(404)
        expect(error.details).toEqual({ id: '123' })
      }
    }
  })
})

describe('Convenience throw functions', () => {
  it('throwValidationError should throw validation error', () => {
    try {
      throwValidationError('Invalid email')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      if (error instanceof ApiError) {
        expect(error.type).toBe(ErrorType.VALIDATION)
        expect(error.statusCode).toBe(400)
        expect(error.message).toBe('Invalid email')
      }
    }
  })

  it('throwAuthError should throw authentication error', () => {
    try {
      throwAuthError()
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      if (error instanceof ApiError) {
        expect(error.type).toBe(ErrorType.AUTHENTICATION)
        expect(error.statusCode).toBe(401)
        expect(error.message).toBe('認証に失敗しました')
      }
    }
  })

  it('throwForbiddenError should throw authorization error', () => {
    try {
      throwForbiddenError()
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      if (error instanceof ApiError) {
        expect(error.type).toBe(ErrorType.AUTHORIZATION)
        expect(error.statusCode).toBe(403)
      }
    }
  })

  it('throwNotFoundError should throw not found error', () => {
    try {
      throwNotFoundError()
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      if (error instanceof ApiError) {
        expect(error.type).toBe(ErrorType.NOT_FOUND)
        expect(error.statusCode).toBe(404)
      }
    }
  })

  it('throwRateLimitError should throw rate limit error', () => {
    try {
      throwRateLimitError()
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      if (error instanceof ApiError) {
        expect(error.type).toBe(ErrorType.RATE_LIMIT)
        expect(error.statusCode).toBe(429)
      }
    }
  })

  it('convenience functions should accept custom messages', () => {
    try {
      throwAuthError('Token expired')
    } catch (error) {
      if (error instanceof ApiError) {
        expect(error.message).toBe('Token expired')
      }
    }
  })
})
