import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET /api/rooms/[roomId]/files - Get all files for a room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params
  try {
    const adminKey = request.headers.get('x-admin-key')

    if (!adminKey) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // Verify room access
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
    const isRoomAdmin = adminKey === room.admin_key

    if (!isSuperAdmin && !isRoomAdmin) {
      return NextResponse.json(
        { error: 'アクセス権限がありません' },
        { status: 403 }
      )
    }

    // Fetch files
    const { data: files, error } = await supabaseAdmin
      .from('files')
      .select('id, file_name, file_size, mime_type, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch files:', error)
      return NextResponse.json(
        { error: 'ファイルの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ files: files || [] })
  } catch (error) {
    console.error('GET /api/rooms/[roomId]/files error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
