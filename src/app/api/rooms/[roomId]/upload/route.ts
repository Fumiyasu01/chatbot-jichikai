import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { extractText } from '@/lib/utils/text-extraction'
import { splitIntoChunks } from '@/lib/utils/chunking'
import { requireAuth } from '@/lib/auth-middleware'
import { logUsage } from '@/lib/usage-tracking'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const dynamic = 'force-dynamic'

// Reduced to 10 seconds - async processing allows this
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

    // Extract text from file
    let text: string
    try {
      text = await extractText(buffer, file.type, file.name)
      console.log('Text extraction successful:', {
        fileName: file.name,
        mimeType: file.type,
        textLength: text.length
      })
    } catch (error) {
      console.error('Text extraction error:', {
        error,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size
      })
      return NextResponse.json(
        { error: `テキストの抽出に失敗しました（${file.name}, ${file.type}）` },
        { status: 500 }
      )
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'ファイルからテキストを抽出できませんでした' },
        { status: 400 }
      )
    }

    // Save file metadata first (minimal DB operation for fast response)
    const filePath = `${roomId}/${Date.now()}-${file.name}`

    const { data: fileMetadata, error: fileError } = await (supabaseAdmin
      .from('files') as any)
      .insert({
        room_id: roomId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        processing_status: 'pending',
        chunk_count: 0, // Will be updated during processing
        processed_chunks: 0,
      })
      .select('id')
      .single()

    if (fileError || !fileMetadata) {
      console.error('File metadata error:', fileError)
      return NextResponse.json(
        { error: 'ファイルメタデータの保存に失敗しました' },
        { status: 500 }
      )
    }

    console.log('File metadata saved:', fileMetadata.id)

    // Store extracted text temporarily for background processing
    // We'll process chunking and document insertion in the background
    try {
      // Store text in a temporary column or separate table
      // For now, we'll create initial documents with the full text
      await (supabaseAdmin
        .from('documents') as any)
        .insert({
          room_id: roomId,
          file_id: fileMetadata.id,
          file_name: file.name,
          content: text, // Store full text temporarily
          embedding: null,
        })

      console.log('Text stored for background processing')
    } catch (error) {
      console.error('Error storing text:', error)
      // Clean up file metadata
      await (supabaseAdmin
        .from('files') as any)
        .delete()
        .eq('id', fileMetadata.id)

      return NextResponse.json(
        { error: 'テキストの保存に失敗しました' },
        { status: 500 }
      )
    }

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
        textLength: text.length,
        asyncProcessing: true,
      },
    })

    console.log('Upload completed! Text chunking and embedding will be processed asynchronously.')
    return NextResponse.json({
      message: 'ファイルをアップロードしました',
      file_id: fileMetadata.id,
      file_name: file.name,
      text_length: text.length,
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
