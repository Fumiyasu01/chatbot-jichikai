import { supabaseAdmin } from '../src/lib/supabase/admin'

interface Room {
  id: string
  name: string
  admin_key: string
  created_at: string
}

async function getRoomKey() {
  const { data: rooms, error } = await supabaseAdmin
    .from('rooms')
    .select('*')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('\n=== 全ルーム一覧 ===\n')

  if (!rooms || rooms.length === 0) {
    console.log('ルームが見つかりません')
    return
  }

  (rooms as Room[]).forEach(room => {
    console.log(`ルーム名: ${room.name}`)
    console.log(`ルームID: ${room.id}`)
    console.log(`管理者キー: ${room.admin_key}`)
    console.log(`作成日: ${new Date(room.created_at).toLocaleString('ja-JP')}`)
    console.log('---')
  })

  const itoRoom = (rooms as Room[]).find(r => r.name.includes('伊都の杜'))
  if (itoRoom) {
    console.log('\n=== 伊都の杜自治会ルーム ===')
    console.log(`管理者キー: ${itoRoom.admin_key}`)
    console.log(`ルームID: ${itoRoom.id}`)
  }
}

getRoomKey()
