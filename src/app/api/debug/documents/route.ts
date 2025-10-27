import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const fileName = searchParams.get('fileName')

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 })
    }

    // Get files
    type FileData = {
      id: string
      file_name: string
      processing_status: string
      chunk_count: number
      processed_chunks: number
      error_message: string | null
      created_at: string
    }

    const { data: files, error: filesError } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })

    if (filesError) {
      return NextResponse.json({ error: filesError.message }, { status: 500 })
    }

    // Get documents
    type DocumentData = {
      id: string
      file_name: string
      content: string
      embedding: number[] | null
      created_at: string
    }

    let query = supabaseAdmin
      .from('documents')
      .select('id, file_name, content, embedding, created_at')
      .eq('room_id', roomId)

    if (fileName) {
      query = query.ilike('file_name', `%${fileName}%`)
    }

    const { data: documents, error: docsError } = await query
      .order('created_at', { ascending: false })
      .limit(20)

    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 500 })
    }

    // Count documents by file
    const { data: docCounts, error: countError } = await supabaseAdmin
      .from('documents')
      .select('file_name, id')
      .eq('room_id', roomId)

    type DocCount = {
      file_name: string
      id: string
    }

    const countsByFile: Record<string, number> = {}
    const withEmbedding: Record<string, number> = {}
    const withoutEmbedding: Record<string, number> = {}

    if (docCounts) {
      for (const doc of docCounts as DocCount[]) {
        countsByFile[doc.file_name] = (countsByFile[doc.file_name] || 0) + 1
      }
    }

    // Count embeddings
    for (const doc of (documents as DocumentData[] | null) || []) {
      const name = doc.file_name
      if (doc.embedding && doc.embedding.length > 0) {
        withEmbedding[name] = (withEmbedding[name] || 0) + 1
      } else {
        withoutEmbedding[name] = (withoutEmbedding[name] || 0) + 1
      }
    }

    return NextResponse.json({
      files: (files as FileData[] | null)?.map(f => ({
        id: f.id,
        file_name: f.file_name,
        processing_status: f.processing_status,
        chunk_count: f.chunk_count,
        processed_chunks: f.processed_chunks,
        error_message: f.error_message,
        created_at: f.created_at,
      })),
      documents: (documents as DocumentData[] | null)?.map(d => ({
        id: d.id,
        file_name: d.file_name,
        content_preview: d.content?.substring(0, 100),
        has_embedding: !!(d.embedding && d.embedding.length > 0),
        embedding_length: d.embedding?.length || 0,
        created_at: d.created_at,
      })),
      summary: {
        total_files: files?.length || 0,
        total_documents: docCounts?.length || 0,
        documents_by_file: countsByFile,
        with_embedding: withEmbedding,
        without_embedding: withoutEmbedding,
      }
    })
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
