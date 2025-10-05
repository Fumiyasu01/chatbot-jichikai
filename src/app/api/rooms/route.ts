import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createRoomSchema } from '@/lib/utils/validation'
import { encrypt, generateRandomKey } from '@/lib/utils/crypto'
import { z } from 'zod'

const ENCRYPTION_PASSWORD = process.env.SUPER_ADMIN_KEY || 'default-password'

// GET /api/rooms - Get all rooms (super admin only)
export async function GET(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key')

    if (!adminKey || adminKey !== process.env.SUPER_ADMIN_KEY) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      )
    }

    const { data: rooms, error } = await supabaseAdmin
      .from('rooms')
      .select('id, name, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch rooms:', error)
      return NextResponse.json(
        { error: 'ルームの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ rooms })
  } catch (error) {
    console.error('GET /api/rooms error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST /api/rooms - Create a new room (super admin only)
export async function POST(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key')

    if (!adminKey || adminKey !== process.env.SUPER_ADMIN_KEY) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validation = createRoomSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: '入力内容に誤りがあります', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { name, openai_api_key, meta_prompt } = validation.data

    // Generate admin key for this room
    const roomAdminKey = generateRandomKey(32)

    // Encrypt the OpenAI API key
    const encryptedApiKey = encrypt(openai_api_key, ENCRYPTION_PASSWORD)

    // Create room in database
    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .insert({
        name,
        admin_key: roomAdminKey,
        openai_api_key: encryptedApiKey,
        meta_prompt: meta_prompt || null,
      })
      .select('id, name, admin_key, created_at')
      .single()

    if (error) {
      console.error('Failed to create room:', error)
      return NextResponse.json(
        { error: 'ルームの作成に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      room: {
        ...room,
        admin_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/${room.id}?key=${room.admin_key}`,
        chat_url: `${process.env.NEXT_PUBLIC_APP_URL}/chat/${room.id}`,
      },
    })
  } catch (error) {
    console.error('POST /api/rooms error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
