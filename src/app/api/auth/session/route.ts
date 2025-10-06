import { NextResponse } from 'next/server'
import { getSessionData } from '@/lib/session'

export async function GET() {
  try {
    const session = await getSessionData()

    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      roomId: session.roomId
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    )
  }
}
