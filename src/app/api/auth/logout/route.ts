import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await destroySession()
    return NextResponse.json({
      success: true,
      message: 'ログアウトしました'
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'ログアウトに失敗しました' },
      { status: 500 }
    )
  }
}
