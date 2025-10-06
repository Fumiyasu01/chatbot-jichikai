import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { getUsageSummary, getRecentUsage } from '@/lib/usage-tracking'

export const dynamic = 'force-dynamic'

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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days
    const includeRecent = searchParams.get('include_recent') === 'true'

    const daysAgo = parseInt(period, 10)
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    const endDate = new Date()

    // Get summary
    const summary = await getUsageSummary(roomId, startDate, endDate)

    // Optionally get recent usage
    let recentUsage = []
    if (includeRecent) {
      recentUsage = await getRecentUsage(roomId, 50)
    }

    return NextResponse.json({
      summary: summary || {
        total_events: 0,
        total_tokens: 0,
        total_cost: 0,
        chat_count: 0,
        upload_count: 0,
        embedding_count: 0,
      },
      recent_usage: recentUsage,
      period_days: daysAgo,
    })
  } catch (error) {
    console.error('GET /api/rooms/[roomId]/usage error:', error)
    return NextResponse.json(
      { error: '使用量の取得に失敗しました' },
      { status: 500 }
    )
  }
}
