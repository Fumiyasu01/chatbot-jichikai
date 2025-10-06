import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  roomId: string
  adminKey: string
  isAuthenticated: boolean
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_secure_sessions',
  cookieName: 'chatbot_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}

export async function createSession(roomId: string, adminKey: string) {
  const session = await getSession()
  session.roomId = roomId
  session.adminKey = adminKey
  session.isAuthenticated = true
  await session.save()
}

export async function destroySession() {
  const session = await getSession()
  session.destroy()
}

export async function getSessionData(): Promise<SessionData | null> {
  const session = await getSession()
  if (!session.isAuthenticated) {
    return null
  }
  return {
    roomId: session.roomId || '',
    adminKey: session.adminKey || '',
    isAuthenticated: session.isAuthenticated,
  }
}
