import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { extractText } from '@/lib/utils/text-extraction'
import { splitIntoChunks } from '@/lib/utils/chunking'
import { decrypt } from '@/lib/utils/crypto'
import { requireAuth } from '@/lib/auth-middleware'
import OpenAI from 'openai'

const ENCRYPTION_PASSWORD = process.env.SUPER_ADMIN_KEY || 'default-password'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const dynamic = 'force-dynamic'

// Set max duration for large file uploads (10 minutes)
export const maxDuration = 600

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

    // Get room data
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('admin_key, openai_api_key')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'ルームが見つかりませんでした' },
        { status: 404 }
      )
    }

    const roomData = room as { admin_key: string; openai_api_key: string }

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

    // Upload file to Supabase Storage
    const filePath = `${roomId}/${Date.now()}-${file.name}`

    // Skip storage upload for now - we'll store metadata and embeddings directly
    console.log('Skipping storage upload, processing file directly...')

    // Save file metadata
    const { data: fileMetadata, error: fileError } = await (supabaseAdmin
      .from('files') as any)
      .insert({
        room_id: roomId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      })
      .select('id')
      .single()

    if (fileError) {
      console.error('File metadata error:', fileError)
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

    // Decrypt OpenAI API key
    let openaiApiKey: string
    try {
      openaiApiKey = decrypt(roomData.openai_api_key, ENCRYPTION_PASSWORD)
    } catch (error) {
      console.error('Decryption error:', error)
      return NextResponse.json(
        { error: 'APIキーの復号化に失敗しました' },
        { status: 500 }
      )
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    // Generate embeddings for all chunks (in batches for large files)
    try {
      console.log('Generating embeddings via OpenAI API...')
      console.log(`Processing ${chunks.length} chunks...`)

      const BATCH_SIZE = 100 // Process 100 chunks at a time
      const embeddings: any[] = []

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE)
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(chunks.length / BATCH_SIZE)

        console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} chunks)...`)

        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: batch,
        })

        embeddings.push(...embeddingResponse.data)

        console.log(`Batch ${batchNumber}/${totalBatches} completed (${embeddings.length}/${chunks.length} total)`)
      }

      console.log('Embeddings generated successfully:', {
        embeddingsCount: embeddings.length,
        dimensions: embeddings[0].embedding.length
      })

      // Prepare document records
      const documents = chunks.map((chunk, index) => ({
        room_id: roomId,
        file_name: file.name,
        content: chunk,
        embedding: embeddings[index].embedding,
      }))

      // Insert documents into database
      console.log('Inserting documents into Supabase...')
      const { error: insertError } = await (supabaseAdmin
        .from('documents') as any)
        .insert(documents)

      if (insertError) {
        console.error('Document insert error:', insertError)
        return NextResponse.json(
          { error: 'ドキュメントの保存に失敗しました' },
          { status: 500 }
        )
      }

      console.log('Upload completed successfully!')
      return NextResponse.json({
        message: 'ファイルをアップロードしました',
        file_name: file.name,
        chunks_count: chunks.length,
      })
    } catch (error) {
      console.error('OpenAI API error:', error)
      return NextResponse.json(
        { error: 'AI処理に失敗しました。APIキーを確認してください。' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('POST /api/rooms/[roomId]/upload error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
