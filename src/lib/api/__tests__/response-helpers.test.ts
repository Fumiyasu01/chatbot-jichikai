import { describe, it, expect } from 'vitest'
import { NextResponse } from 'next/server'
import {
  ApiResponse,
  success,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  tooManyRequests,
  internalError,
} from '../response-helpers'

describe('ApiResponse', () => {
  describe('success', () => {
    it('should return success response with data (200)', async () => {
      const data = { user: { id: 1, name: 'Test User' } }
      const response = ApiResponse.success(data)

      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json).toEqual(data)
    })

    it('should return success response with data and message', async () => {
      const data = { file_id: 123 }
      const message = 'ファイルをアップロードしました'
      const response = ApiResponse.success(data, message)

      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json).toEqual({ message, ...data })
    })

    it('should accept custom status code', async () => {
      const data = { id: 1 }
      const response = ApiResponse.success(data, 'Created', 201)

      expect(response.status).toBe(201)

      const json = await response.json()
      expect(json.message).toBe('Created')
      expect(json.id).toBe(1)
    })

    it('should handle empty object', async () => {
      const response = ApiResponse.success({})

      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json).toEqual({})
    })

    it('should handle arrays', async () => {
      const data = [{ id: 1 }, { id: 2 }]
      const response = ApiResponse.success(data)

      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json).toEqual(data)
    })
  })

  describe('error', () => {
    it('should return error response with default 500 status', async () => {
      const errorMessage = 'Something went wrong'
      const response = ApiResponse.error(errorMessage)

      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(500)

      const json = await response.json()
      expect(json.error).toBe(errorMessage)
      expect(json.details).toBeUndefined()
    })

    it('should return error response with custom status', async () => {
      const errorMessage = 'Bad request'
      const response = ApiResponse.error(errorMessage, 400)

      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.error).toBe(errorMessage)
    })

    it('should include details when provided', async () => {
      const errorMessage = 'Validation failed'
      const details = { field: 'email', issue: 'invalid format' }
      const response = ApiResponse.error(errorMessage, 400, details)

      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.error).toBe(errorMessage)
      expect(json.details).toEqual(details)
    })

    it('should handle details as array', async () => {
      const errorMessage = 'Multiple errors'
      const details = [
        { field: 'email', message: 'required' },
        { field: 'name', message: 'too short' },
      ]
      const response = ApiResponse.error(errorMessage, 400, details)

      const json = await response.json()
      expect(json.details).toEqual(details)
      expect(Array.isArray(json.details)).toBe(true)
    })
  })

  describe('badRequest', () => {
    it('should return 400 with default message', async () => {
      const response = ApiResponse.badRequest()

      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.error).toBe('入力内容に誤りがあります')
    })

    it('should return 400 with custom message', async () => {
      const customMessage = 'Invalid email format'
      const response = ApiResponse.badRequest(customMessage)

      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.error).toBe(customMessage)
    })

    it('should include validation details', async () => {
      const details = { field: 'email', issue: 'required' }
      const response = ApiResponse.badRequest('Invalid input', details)

      const json = await response.json()
      expect(json.details).toEqual(details)
    })
  })

  describe('unauthorized', () => {
    it('should return 401 with default message', async () => {
      const response = ApiResponse.unauthorized()

      expect(response.status).toBe(401)

      const json = await response.json()
      expect(json.error).toBe('認証に失敗しました')
    })

    it('should return 401 with custom message', async () => {
      const customMessage = 'Token expired'
      const response = ApiResponse.unauthorized(customMessage)

      expect(response.status).toBe(401)

      const json = await response.json()
      expect(json.error).toBe(customMessage)
    })
  })

  describe('forbidden', () => {
    it('should return 403 with default message', async () => {
      const response = ApiResponse.forbidden()

      expect(response.status).toBe(403)

      const json = await response.json()
      expect(json.error).toBe('アクセス権がありません')
    })

    it('should return 403 with custom message', async () => {
      const customMessage = 'このルームへのアクセス権がありません'
      const response = ApiResponse.forbidden(customMessage)

      expect(response.status).toBe(403)

      const json = await response.json()
      expect(json.error).toBe(customMessage)
    })
  })

  describe('notFound', () => {
    it('should return 404 with default message', async () => {
      const response = ApiResponse.notFound()

      expect(response.status).toBe(404)

      const json = await response.json()
      expect(json.error).toBe('リソースが見つかりませんでした')
    })

    it('should return 404 with custom message', async () => {
      const customMessage = 'ユーザーが見つかりませんでした'
      const response = ApiResponse.notFound(customMessage)

      expect(response.status).toBe(404)

      const json = await response.json()
      expect(json.error).toBe(customMessage)
    })
  })

  describe('tooManyRequests', () => {
    it('should return 429 with default message', async () => {
      const response = ApiResponse.tooManyRequests()

      expect(response.status).toBe(429)

      const json = await response.json()
      expect(json.error).toBe('APIの利用制限に達しました。しばらく待ってから再度お試しください')
    })

    it('should return 429 with custom message', async () => {
      const customMessage = 'Rate limit exceeded'
      const response = ApiResponse.tooManyRequests(customMessage)

      expect(response.status).toBe(429)

      const json = await response.json()
      expect(json.error).toBe(customMessage)
    })
  })

  describe('internalError', () => {
    it('should return 500 with default message', async () => {
      const response = ApiResponse.internalError()

      expect(response.status).toBe(500)

      const json = await response.json()
      expect(json.error).toBe('予期しないエラーが発生しました')
    })

    it('should return 500 with custom message', async () => {
      const customMessage = 'Database connection failed'
      const response = ApiResponse.internalError(customMessage)

      expect(response.status).toBe(500)

      const json = await response.json()
      expect(json.error).toBe(customMessage)
    })
  })

  describe('Exported convenience functions', () => {
    it('success function should work', async () => {
      const response = success({ id: 1 })
      expect(response.status).toBe(200)
    })

    it('error function should work', async () => {
      const response = error('test error')
      expect(response.status).toBe(500)
    })

    it('badRequest function should work', async () => {
      const response = badRequest()
      expect(response.status).toBe(400)
    })

    it('unauthorized function should work', async () => {
      const response = unauthorized()
      expect(response.status).toBe(401)
    })

    it('forbidden function should work', async () => {
      const response = forbidden()
      expect(response.status).toBe(403)
    })

    it('notFound function should work', async () => {
      const response = notFound()
      expect(response.status).toBe(404)
    })

    it('tooManyRequests function should work', async () => {
      const response = tooManyRequests()
      expect(response.status).toBe(429)
    })

    it('internalError function should work', async () => {
      const response = internalError()
      expect(response.status).toBe(500)
    })
  })
})
