import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// DELETE /api/rooms/[roomId]/files/[fileId] - Delete a file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; fileId: string }> }
) {
  const { roomId, fileId } = await params
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

    // Get file metadata
    const { data: file, error: fileError } = await supabaseAdmin
      .from('files')
      .select('file_name, file_path')
      .eq('id', fileId)
      .eq('room_id', roomId)
      .single()

    if (fileError || !file) {
      return NextResponse.json(
        { error: 'ファイルが見つかりませんでした' },
        { status: 404 }
      )
    }

    // Delete all documents with this file name
    const { error: docsError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('room_id', roomId)
      .eq('file_name', file.file_name)

    if (docsError) {
      console.error('Failed to delete documents:', docsError)
    }

    // Delete file from storage
    const { error: storageError } = await supabaseAdmin
      .storage
      .from('documents')
      .remove([file.file_path])

    if (storageError) {
      console.error('Failed to delete from storage:', storageError)
    }

    // Delete file metadata
    const { error: deleteError } = await supabaseAdmin
      .from('files')
      .delete()
      .eq('id', fileId)

    if (deleteError) {
      console.error('Failed to delete file metadata:', deleteError)
      return NextResponse.json(
        { error: 'ファイルの削除に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'ファイルを削除しました' })
  } catch (error) {
    console.error('DELETE /api/rooms/[roomId]/files/[fileId] error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
