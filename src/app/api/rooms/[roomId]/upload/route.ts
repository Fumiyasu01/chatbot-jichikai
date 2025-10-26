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

    // Split text into chunks
    const chunks = splitIntoChunks(text, 1000, 200)
    console.log('Text chunking successful:', {
      chunksCount: chunks.length,
      avgChunkSize: Math.round(chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length)
    })

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'テキストのチャンク分割に失敗しました' },
        { status: 500 }
      )
    }

    // Save file metadata with processing status
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
        chunk_count: chunks.length,
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

    // Insert documents without embeddings (will be processed asynchronously)
    const documents = chunks.map(chunk => ({
      room_id: roomId,
      file_id: fileMetadata.id,
      file_name: file.name,
      content: chunk,
      embedding: null, // Will be filled by background processing
    }))

    console.log('Inserting documents into Supabase...')
    const { error: insertError } = await (supabaseAdmin
      .from('documents') as any)
      .insert(documents)

    if (insertError) {
      console.error('Document insert error:', insertError)

      // Clean up file metadata
      await (supabaseAdmin
        .from('files') as any)
        .delete()
        .eq('id', fileMetadata.id)

      return NextResponse.json(
        { error: 'ドキュメントの保存に失敗しました' },
        { status: 500 }
      )
    }

    // Log upload usage
    await logUsage({
      roomId,
      eventType: 'upload',
      tokensUsed: 0, // Upload itself doesn't use tokens
      fileName: file.name,
      chunkCount: chunks.length,
      metadata: {
        fileSize: file.size,
        mimeType: file.type,
        fileId: fileMetadata.id,
        asyncProcessing: true,
      },
    })

    console.log('Upload completed successfully! Embeddings will be processed asynchronously.')
    return NextResponse.json({
      message: 'ファイルをアップロードしました',
      file_id: fileMetadata.id,
      file_name: file.name,
      chunks_count: chunks.length,
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
