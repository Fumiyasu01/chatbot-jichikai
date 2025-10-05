import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const { roomId, adminKey } = await request.json()

    if (!roomId || !adminKey) {
      return NextResponse.json(
        { error: 'ルームIDと管理者キーが必要です' },
        { status: 400 }
      )
    }

    // Verify credentials
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('admin_key')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'ルームが見つかりませんでした' },
        { status: 404 }
      )
    }

    const isSuperAdmin = adminKey === process.env.SUPER_ADMIN_KEY
    const isRoomAdmin = adminKey === (room as { admin_key: string }).admin_key

    if (!isSuperAdmin && !isRoomAdmin) {
      return NextResponse.json(
        { error: '管理者キーが正しくありません' },
        { status: 401 }
      )
    }

    // Create session
    await createSession(roomId, adminKey)

    return NextResponse.json({
      success: true,
      message: 'ログインしました'
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'ログインに失敗しました' },
      { status: 500 }
    )
  }
}
