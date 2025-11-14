import { NextRequest, NextResponse } from 'next/server'
import { getSessionData } from './session'
import { supabaseAdmin } from './supabase/admin'
import { z } from 'zod'

const RoomSchema = z.object({
  admin_key: z.string()
}).passthrough()

type RoomData = z.infer<typeof RoomSchema>

export async function requireAuth(request: NextRequest, roomId: string) {
  // Check for legacy header-based auth (for backwards compatibility)
  const headerAdminKey = request.headers.get('x-admin-key')

  if (headerAdminKey) {
    // Legacy auth: verify admin key directly
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('admin_key')
      .eq('id', roomId)
      .single()

    // Validate room data with Zod
    let roomData: RoomData | null = null
    if (room) {
      try {
        roomData = RoomSchema.parse(room)
      } catch (error) {
        return { authenticated: false, error: 'データ形式が不正です' }
      }
    }

    const isSuperAdmin = headerAdminKey === process.env.SUPER_ADMIN_KEY
    const isRoomAdmin = roomData && headerAdminKey === roomData.admin_key

    if (isSuperAdmin || isRoomAdmin) {
      return { authenticated: true, adminKey: headerAdminKey }
    }
  }

  // New session-based auth
  const session = await getSessionData()

  if (!session || !session.isAuthenticated) {
    return { authenticated: false, error: '認証が必要です' }
  }

  if (session.roomId !== roomId) {
    return { authenticated: false, error: 'このルームへのアクセス権がありません' }
  }

  // Verify admin key is still valid
  const { data: room } = await supabaseAdmin
    .from('rooms')
    .select('admin_key')
    .eq('id', roomId)
    .single()

  // Validate room data with Zod
  let roomData: RoomData | null = null
  if (room) {
    try {
      roomData = RoomSchema.parse(room)
    } catch (error) {
      return { authenticated: false, error: 'データ形式が不正です' }
    }
  }

  const isSuperAdmin = session.adminKey === process.env.SUPER_ADMIN_KEY
  const isRoomAdmin = roomData && session.adminKey === roomData.admin_key

  if (!isSuperAdmin && !isRoomAdmin) {
    return { authenticated: false, error: '管理者権限がありません' }
  }

  return { authenticated: true, adminKey: session.adminKey }
}
