import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

  const db = getServiceClient()

  // Get analytics snapshots
  const { data: snapshots, error: snapError } = await db
    .from('analytics')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('week_start', { ascending: false })
    .limit(4)

  if (snapError) return NextResponse.json({ error: snapError.message }, { status: 500 })

  // Derive quick stats from content_queue + trends for the current week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const today = new Date().toISOString().split('T')[0]

  const [{ count: scheduledThisWeek }, { count: trendsToday }] = await Promise.all([
    db
      .from('content_queue')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', weekAgo),
    db
      .from('trends')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', `${today}T00:00:00Z`),
  ])

  const latest = snapshots?.[0]
  const totalViews7d = latest
    ? Object.values(latest.platform_metrics ?? {}).reduce(
        (sum: number, m: unknown) => sum + ((m as { views: number }).views ?? 0),
        0
      )
    : 0

  const engagements = Object.values(latest?.platform_metrics ?? {}) as Array<{ views: number; likes: number }>
  const avgEngagement =
    engagements.length > 0
      ? engagements.reduce((sum, m) => sum + (m.views > 0 ? (m.likes / m.views) * 100 : 0), 0) /
        engagements.length
      : 0

  const stats = {
    scheduledThisWeek: scheduledThisWeek ?? 0,
    trendsToday: trendsToday ?? 0,
    totalViews7d,
    avgEngagement,
    automationEnabled: true, // fetched separately via /api/workspaces
    lastRunAt: snapshots?.[0]?.created_at ?? null,
  }

  return NextResponse.json({ snapshots, stats })
}
