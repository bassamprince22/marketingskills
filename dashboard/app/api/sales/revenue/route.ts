import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

function resolveDateRange(range: string | null): { dateFrom?: string; dateTo?: string } {
  if (!range) return {}
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayEnd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T23:59:59.999Z`
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString()
  const startOfMonth = (y: number, m: number) => `${y}-${pad(m + 1)}-01T00:00:00.000Z`
  const endOfMonth = (y: number, m: number) => {
    const last = new Date(y, m + 1, 0)
    return `${y}-${pad(m + 1)}-${pad(last.getDate())}T23:59:59.999Z`
  }
  switch (range) {
    case 'today':
      return { dateFrom: daysAgo(1), dateTo: todayEnd }
    case 'yesterday': {
      const y = new Date(Date.now() - 86400000)
      const yStart = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}T00:00:00.000Z`
      const yEnd = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}T23:59:59.999Z`
      return { dateFrom: yStart, dateTo: yEnd }
    }
    case '7d':
      return { dateFrom: daysAgo(7), dateTo: todayEnd }
    case '30d':
      return { dateFrom: daysAgo(30), dateTo: todayEnd }
    case '90d':
      return { dateFrom: daysAgo(90), dateTo: todayEnd }
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
  const session = (await getServerSession(authOptions)) as { user?: { id: string } } | null
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db  = getServiceClient()
  const now = new Date()
  const { searchParams } = new URL(req.url)
  const { dateFrom, dateTo } = resolveDateRange(searchParams.get('dateRange'))

  // Fetch won leads from last 13 months so we can compute trend
  const since = new Date(now.getFullYear() - 1, now.getMonth() - 1, 1)
  let query = db
    .from('sales_leads')
    .select('estimated_value, updated_at')
    .eq('pipeline_stage', 'won')
    .gte('updated_at', since.toISOString())
    .not('estimated_value', 'is', null)
  if (dateFrom) query = query.gte('updated_at', dateFrom)
  if (dateTo) query = query.lte('updated_at', dateTo)
  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  // Pre-fill last 12 months with 0
  const byMonth = new Map<string, number>()
  for (let i = 11; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    byMonth.set(key, 0)
  }

  for (const lead of data ?? []) {
    const d   = new Date(lead.updated_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) ?? 0) + (lead.estimated_value ?? 0))
  }

  const months = Array.from(byMonth.entries()).map(([key, value]) => {
    const [, m] = key.split('-')
    return { key, month: MONTHS[parseInt(m) - 1], value }
  })

  const total   = months.reduce((s, r) => s + r.value, 0)
  const recent6 = months.slice(-6).reduce((s, r) => s + r.value, 0)
  const prev6   = months.slice(0, 6).reduce((s, r) => s + r.value, 0)
  const trend   = prev6 > 0 ? ((recent6 - prev6) / prev6) * 100 : 0

  return NextResponse.json({ months, total, trend })
}
