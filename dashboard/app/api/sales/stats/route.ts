import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getManagerStats, getRepStats,
  getPipelineCounts, getRepPerformance,
  getActivities,
  getOverdueFollowups, getStaleLeads,
  getMeetingsToday, getHighValueAtRisk,
  getUnassignedLeads,
} from '@/lib/sales/db'

function resolveDateRange(range: string | null): { dateFrom?: string; dateTo?: string } {
  if (!range) return {}
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T00:00:00.000Z`
  const todayEnd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T23:59:59.999Z`
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString()
  const startOfMonth = (y: number, m: number) => `${y}-${pad(m + 1)}-01T00:00:00.000Z`
  const endOfMonth = (y: number, m: number) => {
    const last = new Date(y, m + 1, 0)
    return `${y}-${pad(m + 1)}-${pad(last.getDate())}T23:59:59.999Z`
  }
  switch (range) {
    case 'today':
      return { dateFrom: todayStart, dateTo: todayEnd }
    case 'yesterday': {
      const y = new Date(Date.now() - 86400000)
      const yStart = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}T00:00:00.000Z`
      const yEnd = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}T23:59:59.999Z`
      return { dateFrom: yStart, dateTo: yEnd }
    }
    case '7d':
      return { dateFrom: daysAgo(7) }
    case '30d':
      return { dateFrom: daysAgo(30) }
    case '90d':
      return { dateFrom: daysAgo(90) }
    case 'this_month':
      return { dateFrom: startOfMonth(now.getFullYear(), now.getMonth()), dateTo: todayEnd }
    case 'last_month': {
      const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1
      const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
      return { dateFrom: startOfMonth(ly, lm), dateTo: endOfMonth(ly, lm) }
    }
    default:
      return {}
  }
}

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions)) as { user?: { id: string; role: string } } | null
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, role } = session.user as { id: string; role: string }
  const { searchParams } = new URL(req.url)
  const { dateFrom, dateTo } = resolveDateRange(searchParams.get('dateRange'))

  try {
    if (role === 'manager' || role === 'admin') {
      const [stats, pipeline, performance, activities, overdue, stale, todayMeetings, atRisk, unassignedLeads] = await Promise.all([
        getManagerStats(dateFrom, dateTo),
        getPipelineCounts(undefined, dateFrom, dateTo),
        getRepPerformance(dateFrom, dateTo),
        getActivities({ limit: 15, dateFrom, dateTo }),
        getOverdueFollowups(undefined, dateFrom, dateTo),
        getStaleLeads(undefined, dateFrom, dateTo),
        getMeetingsToday(undefined, dateFrom, dateTo),
        getHighValueAtRisk(undefined, dateFrom, dateTo),
        getUnassignedLeads(10, dateFrom, dateTo),
      ])
      return NextResponse.json({ type: 'manager', stats, pipeline, performance, activities, overdue, stale, todayMeetings, atRisk, unassignedLeads })
    } else {
      const [stats, pipeline, activities, overdue, stale, todayMeetings, atRisk] = await Promise.all([
        getRepStats(id, dateFrom, dateTo),
        getPipelineCounts(id, dateFrom, dateTo),
        getActivities({ userId: id, limit: 10, dateFrom, dateTo }),
        getOverdueFollowups(id, dateFrom, dateTo),
        getStaleLeads(id, dateFrom, dateTo),
        getMeetingsToday(id, dateFrom, dateTo),
        getHighValueAtRisk(id, dateFrom, dateTo),
      ])
      return NextResponse.json({ type: 'rep', stats, pipeline, activities, overdue, stale, todayMeetings, atRisk })
    }
  } catch (err) {
    console.error('Stats error:', err)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
