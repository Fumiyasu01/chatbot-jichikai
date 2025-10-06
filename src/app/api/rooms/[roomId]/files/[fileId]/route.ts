import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-middleware'

// DELETE /api/rooms/[roomId]/files/[fileId] - Delete a file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; fileId: string }> }
) {
  const { roomId, fileId } = await params
  try {
    const auth = await requireAuth(request, roomId)

    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || '認証に失敗しました' },
        { status: 401 }
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

    const fileData = file as { file_name: string; file_path: string }

    // Delete all documents with this file name
    const { error: docsError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('room_id', roomId)
      .eq('file_name', fileData.file_name)

    if (docsError) {
      console.error('Failed to delete documents:', docsError)
    }

    // Delete file from storage
    const { error: storageError } = await supabaseAdmin
      .storage
      .from('documents')
      .remove([fileData.file_path])

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
