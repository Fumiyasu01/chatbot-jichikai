import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/utils/crypto'
import OpenAI from 'openai'

const ENCRYPTION_PASSWORD = process.env.SUPER_ADMIN_KEY || 'default-password'
const REQUEST_TIMEOUT_MS = 60000 // 60 seconds

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { message, roomId, stream = true } = body

    console.log('=== CHAT REQUEST START ===')
    console.log('Query:', message)
    console.log('Room ID:', roomId)
    console.log('Stream:', stream)

    if (!message || !roomId) {
      return NextResponse.json(
        { error: 'メッセージとルームIDは必須です' },
        { status: 400 }
      )
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'メッセージは2000文字以内で入力してください' },
        { status: 400 }
      )
    }

    // Parallel execution: Fetch room and generate embedding simultaneously
    console.log('[TIMING] Starting parallel room fetch + embedding...')
    const parallelStart = Date.now()

    const [roomResult, embeddingResult] = await Promise.all([
      (async () => {
        try {
          const result = await supabaseAdmin
            .from('rooms')
            .select('name, openai_api_key, meta_prompt')
            .eq('id', roomId)
            .single()
          return { result, error: null }
        } catch (error) {
          return { result: null, error }
        }
      })(),

      (async () => {
        try {
          // Need to decrypt API key first, so this will be done after room fetch
          return { pending: true }
        } catch (error) {
          return { error }
        }
      })()
    ])

    console.log(`[TIMING] Room fetch: ${Date.now() - parallelStart}ms`)

    const { result: roomData, error: roomError } = roomResult as any

    if (roomError || !roomData?.data) {
      console.error('Room fetch error:', roomError)
      return NextResponse.json(
        { error: 'ルームが見つかりませんでした' },
        { status: 404 }
      )
    }

    const room = roomData.data

    // Decrypt OpenAI API key
    let openaiApiKey: string
    try {
      openaiApiKey = decrypt(room.openai_api_key, ENCRYPTION_PASSWORD)
    } catch (error) {
      console.error('Decryption error:', error)
      return NextResponse.json(
        { error: 'システムエラーが発生しました' },
        { status: 500 }
      )
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    // Generate embedding for the question
    console.log('[TIMING] Generating embedding...')
    const embeddingStart = Date.now()

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
    })

    console.log(`[TIMING] Embedding generation: ${Date.now() - embeddingStart}ms`)

    const queryEmbedding = embeddingResponse.data[0].embedding

    // Search for similar documents using hybrid search (vector + keyword)
    console.log('[TIMING] Starting hybrid search...')
    const searchStart = Date.now()

    const { data: matchedDocs, error: searchError } = await supabaseAdmin.rpc(
      'hybrid_search_documents',
      {
        query_embedding: queryEmbedding,
        query_text: message,
        match_threshold: 0.2, // Lowered from 0.5 for better recall (RAG best practice)
        match_count: 5,
        p_room_id: roomId,
        vector_weight: 0.6,   // 60% weight for semantic similarity
        keyword_weight: 0.4,  // 40% weight for keyword matching
      }
    )

    console.log(`[TIMING] Hybrid search: ${Date.now() - searchStart}ms`)

    if (searchError) {
      console.error('Vector search error:', searchError)
      return NextResponse.json(
        { error: '検索に失敗しました' },
        { status: 500 }
      )
    }

    // Log search results
    console.log('\n=== HYBRID SEARCH RESULTS ===')
    console.log('Matched docs:', matchedDocs?.length || 0)
    matchedDocs?.forEach((doc: any, i: number) => {
      console.log(`[${i + 1}] ${doc.file_name}`)
      console.log(`    Vector similarity: ${doc.similarity?.toFixed(4) || 'N/A'}`)
      console.log(`    Keyword rank: ${doc.keyword_rank?.toFixed(4) || 'N/A'}`)
      console.log(`    Combined score: ${doc.combined_score?.toFixed(4) || 'N/A'}`)
      console.log(`    Content preview: ${doc.content?.substring(0, 100)}...`)
    })

    // Build context from matched documents
    let context = ''
    if (matchedDocs && matchedDocs.length > 0) {
      context = matchedDocs
        .map((doc: any) => `【${doc.file_name}】\n${doc.content}`)
        .join('\n\n---\n\n')
    }

    console.log(`\n=== CONTEXT ===`)
    console.log(`Context length: ${context.length} chars`)
    console.log(`Context preview: ${context.substring(0, 200)}...`)

    // Build system prompt
    const systemPrompt = room.meta_prompt || `あなたは${room.name}のサポートAIです。提供された情報を基に、正確で親切な回答を提供してください。`

    // Build messages for ChatGPT
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ]

    if (context) {
      messages.push({
        role: 'system',
        content: `以下の参考情報を使って質問に答えてください。

【重要な制約】
- 必ず以下の参考情報のみを使用して回答してください
- 参考情報に記載されていない内容は、絶対に推測したり、一般知識から補足したりしないでください
- 参考情報に答えが見つからない場合は、「提供された資料には、その情報は記載されていません」と正直に答えてください
- 回答する際は、どの資料から引用したか明記してください

【参考情報】
${context}`,
      })
    } else {
      messages.push({
        role: 'system',
        content: `参考情報が見つかりませんでした。

【重要】
アップロードされた資料に関連する情報が見つかりませんでした。
一般的な知識で回答せず、「申し訳ございませんが、アップロードされた資料には、ご質問に関する情報が見つかりませんでした。」と答えてください。`,
      })
    }

    messages.push({
      role: 'user',
      content: message,
    })

    // Prepare sources metadata
    const sources = matchedDocs?.map((doc: any) => ({
      file_name: doc.file_name,
      similarity: doc.similarity,
    })) || []

    // Generate response using ChatGPT with streaming
    console.log('[TIMING] Starting GPT generation...')
    const gptStart = Date.now()

    if (stream) {
      // Streaming response
      const streamResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.3,
        max_tokens: 1000,
        stream: true,
      })

      // Create a ReadableStream for SSE (Server-Sent Events)
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          try {
            // Send metadata first (sources)
            const metadata = JSON.stringify({ type: 'metadata', sources })
            controller.enqueue(encoder.encode(`data: ${metadata}\n\n`))

            // Stream the GPT response
            let fullAnswer = ''
            for await (const chunk of streamResponse) {
              const content = chunk.choices[0]?.delta?.content || ''
              if (content) {
                fullAnswer += content
                const data = JSON.stringify({ type: 'content', content })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              }
            }

            console.log(`[TIMING] GPT generation: ${Date.now() - gptStart}ms`)
            console.log(`[TIMING] Total request: ${Date.now() - startTime}ms`)
            console.log('\n=== GPT RESPONSE ===')
            console.log(`Answer length: ${fullAnswer.length} chars`)
            console.log(`Answer: ${fullAnswer.substring(0, 200)}...`)

            // Send done signal
            controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'))
            controller.close()
          } catch (error) {
            console.error('Streaming error:', error)
            const errorData = JSON.stringify({
              type: 'error',
              error: '回答の生成中にエラーが発生しました'
            })
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
            controller.close()
          }
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // Non-streaming response (backward compatibility)
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.3,
        max_tokens: 1000,
      })

      console.log(`[TIMING] GPT generation: ${Date.now() - gptStart}ms`)
      console.log(`[TIMING] Total request: ${Date.now() - startTime}ms`)

      const answer = completion.choices[0]?.message?.content || 'すみません、回答を生成できませんでした。'

      console.log('\n=== GPT RESPONSE ===')
      console.log(`Answer: ${answer.substring(0, 200)}...`)

      return NextResponse.json({
        answer,
        sources,
      })
    }
  } catch (error: any) {
    console.error('POST /api/chat error:', error)

    // Handle OpenAI API errors
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'APIキーが無効です' },
        { status: 500 }
      )
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'APIの利用制限に達しました。しばらく待ってから再度お試しください' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
