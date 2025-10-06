import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { updateRoomSchema } from '@/lib/utils/validation'
import { encrypt, decrypt } from '@/lib/utils/crypto'
import { requireAuth } from '@/lib/auth-middleware'

const ENCRYPTION_PASSWORD = process.env.SUPER_ADMIN_KEY || 'default-password'

export const dynamic = 'force-dynamic'

// GET /api/rooms/[roomId] - Get room details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params
  try {
    const auth = await requireAuth(request, roomId)

    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || '認証に失敗しました' },
        { status: 401 }
      )
    }

    // Fetch room
    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (error || !room) {
      return NextResponse.json(
        { error: 'ルームが見つかりませんでした' },
        { status: 404 }
      )
    }

    const roomData = room as any

    // Decrypt OpenAI API key for display (masked)
    let apiKeyDisplay = '****'
    try {
      const decryptedKey = decrypt(roomData.openai_api_key, ENCRYPTION_PASSWORD)
      apiKeyDisplay = decryptedKey.substring(0, 7) + '...' + decryptedKey.slice(-4)
    } catch (error) {
      console.error('Failed to decrypt API key:', error)
    }

    return NextResponse.json({
      room: {
        id: roomData.id,
        name: roomData.name,
        admin_key: roomData.admin_key,
        openai_api_key_display: apiKeyDisplay,
        meta_prompt: roomData.meta_prompt,
        created_at: roomData.created_at,
        updated_at: roomData.updated_at,
      },
    })
  } catch (error) {
    console.error('GET /api/rooms/[roomId] error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PATCH /api/rooms/[roomId] - Update room
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params
  try {
    const auth = await requireAuth(request, roomId)

    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || '認証に失敗しました' },
        { status: 401 }
      )
    }

    // Fetch room to verify access
    const { data: room, error: fetchError } = await supabaseAdmin
      .from('rooms')
      .select('admin_key, name, meta_prompt')
      .eq('id', roomId)
      .single()

    if (fetchError || !room) {
      return NextResponse.json(
        { error: 'ルームが見つかりませんでした' },
        { status: 404 }
      )
    }

    const roomInfo = room as { admin_key: string; name: string; meta_prompt: string | null }

    const body = await request.json()

    // Validate request body
    const validation = updateRoomSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: '入力内容に誤りがあります', details: validation.error.errors },
        { status: 400 }
      )
    }

    const updateData: any = {}

    if (validation.data.name) {
      updateData.name = validation.data.name
    }

    if (validation.data.openai_api_key) {
      updateData.openai_api_key = encrypt(validation.data.openai_api_key, ENCRYPTION_PASSWORD)
    }

    if (validation.data.meta_prompt !== undefined) {
      updateData.meta_prompt = validation.data.meta_prompt
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        room: {
          id: roomId,
          name: roomInfo.name,
          meta_prompt: roomInfo.meta_prompt,
        },
      })
    }

    // Update room
    const { data: updatedRoom, error: updateError } = await (supabaseAdmin.from('rooms') as any)
      .update(updateData)
      .eq('id', roomId)
      .select('id, name, meta_prompt, updated_at')
      .single()

    if (updateError) {
      console.error('Failed to update room:', updateError)
      return NextResponse.json(
        { error: 'ルームの更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ room: updatedRoom })
  } catch (error) {
    console.error('PATCH /api/rooms/[roomId] error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// DELETE /api/rooms/[roomId] - Delete room (super admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params
  try {
    const adminKey = request.headers.get('x-admin-key')

    if (!adminKey || adminKey !== process.env.SUPER_ADMIN_KEY) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      )
    }

    const { error } = await supabaseAdmin
      .from('rooms')
      .delete()
      .eq('id', roomId)

    if (error) {
      console.error('Failed to delete room:', error)
      return NextResponse.json(
        { error: 'ルームの削除に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'ルームを削除しました' })
  } catch (error) {
    console.error('DELETE /api/rooms/[roomId] error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
