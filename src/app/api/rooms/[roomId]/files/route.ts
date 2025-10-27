import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// GET /api/rooms/[roomId]/files - Get all files for a room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params
  try {
    const auth = await requireAuth(request, roomId)

    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || '認証に失敗しました' },
        { status: 401 }
      )
    }

    // Fetch files
    const { data: files, error } = await supabaseAdmin
      .from('files')
      .select('id, file_name, file_size, mime_type, processing_status, error_message, chunk_count, processed_chunks, created_at, updated_at')
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
