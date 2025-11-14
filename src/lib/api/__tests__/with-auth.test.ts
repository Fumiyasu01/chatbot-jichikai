import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import {
  withAuth,
  withSuperAdmin,
  isSuperAdmin,
  isAuthenticated,
  AuthContext,
} from '../with-auth'
import { requireAuth } from '@/lib/auth-middleware'

// Mock dependencies
vi.mock('@/lib/auth-middleware', () => ({
  requireAuth: vi.fn(),
}))

describe('withAuth', () => {
  const mockRequireAuth = vi.mocked(requireAuth)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Successful authentication scenarios', () => {
    it('should successfully authenticate with valid admin key', async () => {
      // Arrange
      const roomId = 'test-room-123'
      const adminKey = 'valid-admin-key'

      mockRequireAuth.mockResolvedValue({
        authenticated: true,
        adminKey,
      })

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )

      const wrappedHandler = withAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/rooms/test-room-123')
      const context = { params: Promise.resolve({ roomId }) }

      // Act
      const response = await wrappedHandler(request, context)

      // Assert
      expect(mockRequireAuth).toHaveBeenCalledWith(request, roomId)
      expect(mockHandler).toHaveBeenCalledWith(
        request,
        context,
        expect.objectContaining({
          adminKey,
          isAuthenticated: true,
        })
      )
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.success).toBe(true)
    })

    it('should successfully authenticate with session-based auth', async () => {
      // Arrange
      const roomId = 'test-room-456'
      const adminKey = 'session-admin-key'

      mockRequireAuth.mockResolvedValue({
        authenticated: true,
        adminKey,
      })

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ data: 'success' })
      )

      const wrappedHandler = withAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/rooms/test-room-456')
      const context = { params: Promise.resolve({ roomId }) }

      // Act
      const response = await wrappedHandler(request, context)

      // Assert
      expect(mockRequireAuth).toHaveBeenCalledWith(request, roomId)
      expect(mockHandler).toHaveBeenCalledTimes(1)
      expect(response.status).toBe(200)
    })

    it('should authenticate super admin correctly', async () => {
      // Arrange
      const roomId = 'any-room'
      const superAdminKey = process.env.SUPER_ADMIN_KEY || 'super-admin-key'

      mockRequireAuth.mockResolvedValue({
        authenticated: true,
        adminKey: superAdminKey,
      })

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ admin: true })
      )

      const wrappedHandler = withAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/rooms/any-room', {
        headers: {
          'x-admin-key': superAdminKey,
        },
      })
      const context = { params: Promise.resolve({ roomId }) }

      // Act
      const response = await wrappedHandler(request, context)

      // Assert
      expect(mockRequireAuth).toHaveBeenCalled()
      expect(mockHandler).toHaveBeenCalled()
      expect(response.status).toBe(200)
    })

    it('should pass all parameters correctly to the handler', async () => {
      // Arrange
      const roomId = 'param-test-room'
      const adminKey = 'test-admin-key'

      mockRequireAuth.mockResolvedValue({
        authenticated: true,
        adminKey,
      })

      let capturedRequest: NextRequest | null = null
      let capturedContext: any = null
      let capturedAuth: AuthContext | null = null

      const mockHandler = vi.fn().mockImplementation(async (req, ctx, auth) => {
        capturedRequest = req
        capturedContext = ctx
        capturedAuth = auth
        return NextResponse.json({ ok: true })
      })

      const wrappedHandler = withAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/rooms/param-test-room')
      const context = { params: Promise.resolve({ roomId }) }

      // Act
      await wrappedHandler(request, context)

      // Assert
      expect(capturedRequest).toBe(request)
      expect(capturedContext).toBe(context)
      expect(capturedAuth).toEqual({
        adminKey,
        isAuthenticated: true,
      })
    })
  })

  describe('Failed authentication scenarios', () => {
    it('should return 401 when admin key is invalid', async () => {
      // Arrange
      const roomId = 'test-room'

      mockRequireAuth.mockResolvedValue({
        authenticated: false,
        error: '認証に失敗しました',
      })

      const mockHandler = vi.fn()
      const wrappedHandler = withAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/rooms/test-room', {
        headers: {
          'x-admin-key': 'invalid-key',
        },
      })
      const context = { params: Promise.resolve({ roomId }) }

      // Act
      const response = await wrappedHandler(request, context)

      // Assert
      expect(mockRequireAuth).toHaveBeenCalledWith(request, roomId)
      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)

      const json = await response.json()
      expect(json.error).toBe('認証に失敗しました')
    })

    it('should return 401 when no session exists', async () => {
      // Arrange
      const roomId = 'test-room'

      mockRequireAuth.mockResolvedValue({
        authenticated: false,
        error: '認証が必要です',
      })

      const mockHandler = vi.fn()
      const wrappedHandler = withAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/rooms/test-room')
      const context = { params: Promise.resolve({ roomId }) }

      // Act
      const response = await wrappedHandler(request, context)

      // Assert
      expect(response.status).toBe(401)

      const json = await response.json()
      expect(json.error).toBe('認証が必要です')
    })

    it('should return 401 when roomId does not match session', async () => {
      // Arrange
      const roomId = 'different-room'

      mockRequireAuth.mockResolvedValue({
        authenticated: false,
        error: 'このルームへのアクセス権がありません',
      })

      const mockHandler = vi.fn()
      const wrappedHandler = withAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/rooms/different-room')
      const context = { params: Promise.resolve({ roomId }) }

      // Act
      const response = await wrappedHandler(request, context)

      // Assert
      expect(response.status).toBe(401)

      const json = await response.json()
      expect(json.error).toBe('このルームへのアクセス権がありません')
    })

    it('should return 401 with default error message when error is undefined', async () => {
      // Arrange
      const roomId = 'test-room'

      mockRequireAuth.mockResolvedValue({
        authenticated: false,
      })

      const mockHandler = vi.fn()
      const wrappedHandler = withAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/rooms/test-room')
      const context = { params: Promise.resolve({ roomId }) }

      // Act
      const response = await wrappedHandler(request, context)

      // Assert
      expect(response.status).toBe(401)

      const json = await response.json()
      expect(json.error).toBe('認証に失敗しました')
    })
  })

  describe('Error handling', () => {
    it('should return 500 when requireAuth throws an error', async () => {
      // Arrange
      const roomId = 'test-room'

      mockRequireAuth.mockRejectedValue(new Error('Database connection failed'))

      const mockHandler = vi.fn()
      const wrappedHandler = withAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/rooms/test-room')
      const context = { params: Promise.resolve({ roomId }) }

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      const response = await wrappedHandler(request, context)

      // Assert
      expect(response.status).toBe(500)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'withAuth error:',
        expect.any(Error)
      )

      const json = await response.json()
      expect(json.error).toBe('予期しないエラーが発生しました')

      consoleErrorSpy.mockRestore()
    })

    it('should return 500 when handler throws an error', async () => {
      // Arrange
      const roomId = 'test-room'
      const adminKey = 'valid-key'

      mockRequireAuth.mockResolvedValue({
        authenticated: true,
        adminKey,
      })

      const mockHandler = vi.fn().mockRejectedValue(new Error('Handler error'))
      const wrappedHandler = withAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/rooms/test-room')
      const context = { params: Promise.resolve({ roomId }) }

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      const response = await wrappedHandler(request, context)

      // Assert
      expect(response.status).toBe(500)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'withAuth error:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should return 500 when params promise rejects', async () => {
      // Arrange
      const mockHandler = vi.fn()
      const wrappedHandler = withAuth(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/rooms/test-room')
      const context = { params: Promise.reject(new Error('Invalid params')) }

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      const response = await wrappedHandler(request, context)

      // Assert
      expect(response.status).toBe(500)
      expect(mockHandler).not.toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })
})

describe('withSuperAdmin', () => {
  const originalSuperAdminKey = process.env.SUPER_ADMIN_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPER_ADMIN_KEY = 'test-super-admin-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env.SUPER_ADMIN_KEY = originalSuperAdminKey
  })

  describe('Successful super admin authentication', () => {
    it('should allow access with valid super admin key', async () => {
      // Arrange
      const superAdminKey = 'test-super-admin-key'
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ message: 'Super admin access granted' })
      )

      const wrappedHandler = withSuperAdmin(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/admin', {
        headers: {
          'x-admin-key': superAdminKey,
        },
      })

      // Act
      const response = await wrappedHandler(request)

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(request)
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.message).toBe('Super admin access granted')
    })
  })

  describe('Failed super admin authentication', () => {
    it('should return 401 with invalid super admin key', async () => {
      // Arrange
      const mockHandler = vi.fn()
      const wrappedHandler = withSuperAdmin(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/admin', {
        headers: {
          'x-admin-key': 'invalid-key',
        },
      })

      // Act
      const response = await wrappedHandler(request)

      // Assert
      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)

      const json = await response.json()
      expect(json.error).toBe('認証に失敗しました')
    })

    it('should return 401 when no admin key is provided', async () => {
      // Arrange
      const mockHandler = vi.fn()
      const wrappedHandler = withSuperAdmin(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/admin')

      // Act
      const response = await wrappedHandler(request)

      // Assert
      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)

      const json = await response.json()
      expect(json.error).toBe('認証に失敗しました')
    })
  })

  describe('Error handling', () => {
    it('should return 500 when handler throws an error', async () => {
      // Arrange
      const superAdminKey = 'test-super-admin-key'
      const mockHandler = vi.fn().mockRejectedValue(new Error('Handler error'))
      const wrappedHandler = withSuperAdmin(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/admin', {
        headers: {
          'x-admin-key': superAdminKey,
        },
      })

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      const response = await wrappedHandler(request)

      // Assert
      expect(response.status).toBe(500)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'withSuperAdmin error:',
        expect.any(Error)
      )

      const json = await response.json()
      expect(json.error).toBe('予期しないエラーが発生しました')

      consoleErrorSpy.mockRestore()
    })
  })
})

describe('isSuperAdmin', () => {
  const originalSuperAdminKey = process.env.SUPER_ADMIN_KEY

  beforeEach(() => {
    process.env.SUPER_ADMIN_KEY = 'test-super-admin-key'
  })

  afterEach(() => {
    process.env.SUPER_ADMIN_KEY = originalSuperAdminKey
  })

  it('should return true when admin key matches SUPER_ADMIN_KEY', () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-admin-key': 'test-super-admin-key',
      },
    })

    // Act
    const result = isSuperAdmin(request)

    // Assert
    expect(result).toBe(true)
  })

  it('should return false when admin key does not match SUPER_ADMIN_KEY', () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-admin-key': 'wrong-key',
      },
    })

    // Act
    const result = isSuperAdmin(request)

    // Assert
    expect(result).toBe(false)
  })

  it('should return false when no admin key is provided', () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/test')

    // Act
    const result = isSuperAdmin(request)

    // Assert
    expect(result).toBe(false)
  })

  it('should return false when SUPER_ADMIN_KEY is not set', () => {
    // Arrange
    delete process.env.SUPER_ADMIN_KEY

    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-admin-key': 'any-key',
      },
    })

    // Act
    const result = isSuperAdmin(request)

    // Assert
    expect(result).toBe(false)
  })
})

describe('isAuthenticated (type guard)', () => {
  it('should return true for authenticated auth with adminKey', () => {
    // Arrange
    const auth = {
      authenticated: true,
      adminKey: 'valid-admin-key',
    }

    // Act
    const result = isAuthenticated(auth)

    // Assert
    expect(result).toBe(true)

    // Type guard should narrow the type
    if (result) {
      // This should not cause TypeScript errors
      const key: string = auth.adminKey
      expect(key).toBe('valid-admin-key')
    }
  })

  it('should return false when authenticated is false', () => {
    // Arrange
    const auth = {
      authenticated: false,
      error: 'Not authenticated',
    }

    // Act
    const result = isAuthenticated(auth)

    // Assert
    expect(result).toBe(false)
  })

  it('should return false when authenticated is true but adminKey is missing', () => {
    // Arrange
    const auth = {
      authenticated: true,
    }

    // Act
    const result = isAuthenticated(auth)

    // Assert
    expect(result).toBe(false)
  })

  it('should return false when authenticated is true but adminKey is empty string', () => {
    // Arrange
    const auth = {
      authenticated: true,
      adminKey: '',
    }

    // Act
    const result = isAuthenticated(auth)

    // Assert
    expect(result).toBe(false)
  })

  it('should return false when authenticated is true but adminKey is undefined', () => {
    // Arrange
    const auth = {
      authenticated: true,
      adminKey: undefined,
    }

    // Act
    const result = isAuthenticated(auth)

    // Assert
    expect(result).toBe(false)
  })

  it('should work correctly in conditional type narrowing', () => {
    // Arrange
    const successAuth = {
      authenticated: true,
      adminKey: 'valid-key',
    }

    const failureAuth = {
      authenticated: false,
      error: 'Failed',
    }

    // Act & Assert
    if (isAuthenticated(successAuth)) {
      // TypeScript should know adminKey exists here
      expect(successAuth.adminKey).toBe('valid-key')
    } else {
      // This branch should not execute
      expect(true).toBe(false)
    }

    if (isAuthenticated(failureAuth)) {
      // This branch should not execute
      expect(true).toBe(false)
    } else {
      // TypeScript should know this is the failure case
      expect(failureAuth.authenticated).toBe(false)
    }
  })
})
