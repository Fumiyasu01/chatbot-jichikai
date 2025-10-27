import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-middleware'
import { logUsage } from '@/lib/usage-tracking'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const dynamic = 'force-dynamic'

// Upload is now instant - just saves binary data
export const maxDuration = 10

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  console.log('=== UPLOAD API CALLED ===')
  const { roomId } = await params
  console.log('Room ID:', roomId)

  try {
    const auth = await requireAuth(request, roomId)

    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || '認証に失敗しました' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `ファイルサイズは${MAX_FILE_SIZE / 1024 / 1024}MB以下にしてください` },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log('File received:', {
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size
    })

    // Save file with binary data (instant operation)
    const filePath = `${roomId}/${Date.now()}-${file.name}`

    const { data: fileMetadata, error: fileError } = await (supabaseAdmin
      .from('files') as any)
      .insert({
        room_id: roomId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        file_data: buffer, // Store binary data for background processing
        processing_status: 'pending',
        chunk_count: 0, // Will be updated during processing
        processed_chunks: 0,
      })
      .select('id')
      .single()

    if (fileError || !fileMetadata) {
      console.error('File metadata error:', fileError)
      return NextResponse.json(
        { error: 'ファイルの保存に失敗しました' },
        { status: 500 }
      )
    }

    console.log('File saved successfully:', fileMetadata.id)

    // Log upload usage
    await logUsage({
      roomId,
      eventType: 'upload',
      tokensUsed: 0,
      fileName: file.name,
      chunkCount: 0, // Will be calculated during background processing
      metadata: {
        fileSize: file.size,
        mimeType: file.type,
        fileId: fileMetadata.id,
        asyncProcessing: true,
      },
    })

    console.log('Upload completed! Text extraction and processing will happen in background.')
    return NextResponse.json({
      message: 'ファイルをアップロードしました',
      file_id: fileMetadata.id,
      file_name: file.name,
      file_size: file.size,
      processing_status: 'pending',
    })
  } catch (error) {
    console.error('POST /api/rooms/[roomId]/upload error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
