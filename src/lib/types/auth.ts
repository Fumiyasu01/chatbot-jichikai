/**
 * Authentication-related types
 */

// Session data
export interface SessionData {
  roomId: string
  adminKey: string
  isAuthenticated: boolean
}

// Auth result
export interface AuthResult {
  authenticated: boolean
  adminKey?: string
  error?: string
}

// Login request
export interface LoginRequest {
  roomId: string
  adminKey: string
}

// Login response
export interface LoginResponse {
  success: boolean
  message: string
}

// Session response
export interface SessionResponse {
  authenticated: boolean
  roomId?: string
  adminKey?: string
}
