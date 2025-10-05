import { supabaseAdmin } from '../src/lib/supabase/admin'

interface RoomInfo {
  id: string
  name: string
  created_at: string
}

async function listRooms() {
  console.log('=== 現在のルーム一覧 ===\n')

  const { data, error } = await supabaseAdmin
    .from('rooms')
    .select('id, name, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ エラー:', error)
    return
  }

  if (!data || data.length === 0) {
    console.log('ルームがありません')
    return
  }

  (data as RoomInfo[]).forEach((room, i) => {
    console.log(`[${i + 1}] ${room.name}`)
    console.log(`    ID: ${room.id}`)
    console.log(`    URL: http://localhost:3000/admin/${room.id}`)
    console.log(`    作成日: ${new Date(room.created_at).toLocaleString('ja-JP')}\n`)
  })

  console.log(`合計: ${data.length} ルーム`)
}

listRooms()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
