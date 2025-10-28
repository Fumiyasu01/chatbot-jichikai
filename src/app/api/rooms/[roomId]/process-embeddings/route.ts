import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/utils/crypto'
import { logUsage } from '@/lib/usage-tracking'
import { splitIntoChunks } from '@/lib/utils/chunking'
import { extractText } from '@/lib/utils/text-extraction'
import OpenAI from 'openai'

const ENCRYPTION_PASSWORD = process.env.SUPER_ADMIN_KEY || 'default-password'

// Process embeddings in batches to stay within 10 second limit
const BATCH_SIZE = 20 // Process 20 chunks at a time (conservative for Hobby plan)

export const dynamic = 'force-dynamic'
export const maxDuration = 10 // Keep at 10 seconds - this will be called multiple times

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  console.log('=== PROCESS EMBEDDINGS API CALLED ===')
  const { roomId } = await params
  let fileId: string | undefined

  try {
    const body = await request.json()
    fileId = body.fileId

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId is required' },
        { status: 400 }
      )
    }

    console.log('Processing embeddings for file:', fileId)

    // Get file information
    const { data: file, error: fileError } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('room_id', roomId)
      .single()

    if (fileError || !file) {
      console.error('File not found:', fileError)
      return NextResponse.json(
        { error: 'ファイルが見つかりませんでした' },
        { status: 404 }
      )
    }

    // Type assertion for file data
    type FileData = {
      id: string
      room_id: string
      processing_status: 'pending' | 'processing' | 'completed' | 'failed'
      chunk_count: number
      processed_chunks: number
      file_name: string
      file_data: Buffer | null
      mime_type: string
    }
    const fileData = file as FileData

    // Check if already completed
    if (fileData.processing_status === 'completed') {
      console.log('File already completed')
      return NextResponse.json({
        message: 'Already completed',
        status: 'completed',
        progress: { processed: fileData.chunk_count, total: fileData.chunk_count }
      })
    }

    // Update status to processing
    await (supabaseAdmin
      .from('files') as any)
      .update({ processing_status: 'processing' })
      .eq('id', fileId)

    // Get room data for API key
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('openai_api_key')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      throw new Error('ルームが見つかりませんでした')
    }

    type RoomData = {
      openai_api_key: string
    }
    const roomData = room as RoomData

    // Decrypt OpenAI API key
    let openaiApiKey: string
    try {
      openaiApiKey = decrypt(roomData.openai_api_key, ENCRYPTION_PASSWORD)
    } catch (error) {
      console.error('Decryption error:', error)
      await (supabaseAdmin
        .from('files') as any)
        .update({
          processing_status: 'failed',
          error_message: 'APIキーの復号化に失敗しました'
        })
        .eq('id', fileId)
      return NextResponse.json(
        { error: 'APIキーの復号化に失敗しました' },
        { status: 500 }
      )
    }

    // Initialize OpenAI
    const openai = new OpenAI({ apiKey: openaiApiKey })

    // Check if we need to chunk the text first
    if (fileData.chunk_count === 0) {
      console.log('Chunking text for the first time...')

      let fullText: string

      // Check if we need to extract text from binary data first
      if (fileData.file_data) {
        console.log('Extracting text from binary data...')

        try {
          // Handle BYTEA data from Supabase
          // Supabase returns BYTEA as Buffer or Uint8Array depending on environment
          let buffer: Buffer
          const binaryData = fileData.file_data as any // Type assertion for runtime checks

          if (Buffer.isBuffer(binaryData)) {
            buffer = binaryData
          } else if (binaryData instanceof Uint8Array) {
            buffer = Buffer.from(binaryData)
          } else {
            // If it's a hex string (fallback), convert it
            const hexString = String(binaryData).replace(/^\\x/, '')
            buffer = Buffer.from(hexString, 'hex')
          }

          fullText = await extractText(buffer, fileData.mime_type, fileData.file_name)
          console.log(`Text extracted: ${fullText.length} characters`)

          // Clear binary data after successful extraction to save space
          await (supabaseAdmin
            .from('files') as any)
            .update({ file_data: null })
            .eq('id', fileId)
        } catch (extractError) {
          console.error('Text extraction error:', extractError)
          await (supabaseAdmin
            .from('files') as any)
            .update({
              processing_status: 'failed',
              error_message: 'テキスト抽出に失敗しました'
            })
            .eq('id', fileId)
          throw new Error('テキスト抽出に失敗しました')
        }
      } else {
        // Fallback: Get the full text document (for files uploaded with old flow)
        const { data: fullTextDoc, error: fullTextError } = await supabaseAdmin
          .from('documents')
          .select('id, content')
          .eq('file_id', fileId)
          .single()

        if (fullTextError || !fullTextDoc) {
          throw new Error('全文テキストの取得に失敗しました')
        }

        fullText = (fullTextDoc as { id: string; content: string }).content

        // Delete the temporary full-text document
        await (supabaseAdmin
          .from('documents') as any)
          .delete()
          .eq('id', (fullTextDoc as { id: string }).id)
      }

      // Split into chunks
      const chunks = splitIntoChunks(fullText, 1000, 200)
      console.log(`Text split into ${chunks.length} chunks`)

      // Insert chunked documents
      const chunkDocuments = chunks.map(chunk => ({
        room_id: roomId,
        file_id: fileId,
        file_name: fileData.file_name,
        content: chunk,
        embedding: null,
      }))

      const { error: insertError } = await (supabaseAdmin
        .from('documents') as any)
        .insert(chunkDocuments)

      if (insertError) {
        throw new Error('チャンクドキュメントの保存に失敗しました')
      }

      // Update file chunk count
      await (supabaseAdmin
        .from('files') as any)
        .update({
          chunk_count: chunks.length,
          processing_status: 'processing'
        })
        .eq('id', fileId)

      fileData.chunk_count = chunks.length
      console.log(`Chunk count updated: ${chunks.length}`)

      // Return immediately after chunking - embeddings will be processed in next call
      return NextResponse.json({
        message: 'Text chunked successfully',
        status: 'processing',
        progress: {
          processed: 0,
          total: chunks.length
        }
      })
    }

    // Get pending documents (those without embeddings)
    const { data: pendingDocs, error: docsError } = await supabaseAdmin
      .from('documents')
      .select('id, content')
      .eq('file_id', fileId)
      .is('embedding', null)
      .limit(BATCH_SIZE)

    if (docsError) {
      console.error('Error fetching pending documents:', docsError)
      throw new Error('ドキュメントの取得に失敗しました')
    }

    type DocumentData = {
      id: string
      content: string
    }
    const pendingDocuments = (pendingDocs || []) as DocumentData[]

    if (pendingDocuments.length === 0) {
      // All done!
      console.log('All embeddings completed')
      await (supabaseAdmin
        .from('files') as any)
        .update({
          processing_status: 'completed',
          processed_chunks: fileData.chunk_count
        })
        .eq('id', fileId)

      return NextResponse.json({
        message: 'All embeddings completed',
        status: 'completed',
        progress: { processed: fileData.chunk_count, total: fileData.chunk_count }
      })
    }

    console.log(`Processing batch of ${pendingDocuments.length} documents...`)

    // Generate embeddings for this batch
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: pendingDocuments.map(doc => doc.content),
    })

    const embeddings = embeddingResponse.data
    const tokensUsed = embeddingResponse.usage?.total_tokens || 0

    console.log(`Generated ${embeddings.length} embeddings, ${tokensUsed} tokens`)

    // Update documents with embeddings
    const updatePromises = pendingDocuments.map((doc, index) =>
      (supabaseAdmin
        .from('documents') as any)
        .update({ embedding: embeddings[index].embedding })
        .eq('id', doc.id)
    )

    await Promise.all(updatePromises)

    // Update file progress
    const newProcessedCount = fileData.processed_chunks + pendingDocuments.length
    const isComplete = newProcessedCount >= fileData.chunk_count

    await (supabaseAdmin
      .from('files') as any)
      .update({
        processed_chunks: newProcessedCount,
        processing_status: isComplete ? 'completed' : 'processing'
      })
      .eq('id', fileId)

    // Log embedding usage
    await logUsage({
      roomId,
      eventType: 'embedding',
      tokensUsed,
      fileName: fileData.file_name,
      chunkCount: pendingDocuments.length,
      metadata: {
        model: 'text-embedding-3-small',
        embeddingsCount: embeddings.length,
        fileId,
        batchProcessing: true
      },
    })

    console.log(`Progress: ${newProcessedCount}/${fileData.chunk_count}`)

    return NextResponse.json({
      message: isComplete ? 'Completed' : 'Batch processed',
      status: isComplete ? 'completed' : 'processing',
      progress: {
        processed: newProcessedCount,
        total: fileData.chunk_count
      }
    })

  } catch (error) {
    console.error('POST /api/rooms/[roomId]/process-embeddings error:', error)

    // Try to update file status to failed
    try {
      if (fileId) {
        await (supabaseAdmin
          .from('files') as any)
          .update({
            processing_status: 'failed',
            error_message: error instanceof Error ? error.message : '予期しないエラーが発生しました'
          })
          .eq('id', fileId)
      }
    } catch (updateError) {
      console.error('Failed to update file status:', updateError)
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
