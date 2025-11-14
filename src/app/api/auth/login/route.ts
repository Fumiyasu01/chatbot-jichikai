import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createSession } from '@/lib/session'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const RoomSchema = z.object({
  admin_key: z.string()
}).passthrough()

export async function POST(request: NextRequest) {
  try {
    const { roomId, adminKey } = await request.json()

    console.log('[Login] Attempt:', { roomId, adminKeyLength: adminKey?.length })

    if (!roomId || !adminKey) {
      console.log('[Login] Missing credentials')
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

    console.log('[Login] Database query:', {
      found: !!room,
      error: roomError?.message,
      dbAdminKeyLength: room ? (room as { admin_key: string }).admin_key?.length : 0
    })

    if (roomError || !room) {
      console.log('[Login] Room not found')
      return NextResponse.json(
        { error: 'ルームが見つかりませんでした' },
        { status: 404 }
      )
    }

    // Validate with Zod
    let roomData
    try {
      roomData = RoomSchema.parse(room)
    } catch (error) {
      console.error('[Login] Zod validation failed:', error)
      return NextResponse.json(
        { error: 'データ形式が不正です' },
        { status: 500 }
      )
    }

    const isSuperAdmin = adminKey === process.env.SUPER_ADMIN_KEY
    const isRoomAdmin = adminKey === roomData.admin_key

    console.log('[Login] Auth check:', {
      isSuperAdmin,
      isRoomAdmin,
      inputKeyFirst10: adminKey?.substring(0, 10),
      dbKeyFirst10: roomData.admin_key?.substring(0, 10)
    })

    if (!isSuperAdmin && !isRoomAdmin) {
      console.log('[Login] Auth failed')
      return NextResponse.json(
        { error: '管理者キーが正しくありません' },
        { status: 401 }
      )
    }

    // Create session
    await createSession(roomId, adminKey)

    console.log('[Login] Success')
    return NextResponse.json({
      success: true,
      message: 'ログインしました'
    })
  } catch (error) {
    console.error('[Login] Error:', error)
    return NextResponse.json(
      { error: 'ログインに失敗しました' },
      { status: 500 }
    )
  }
}
