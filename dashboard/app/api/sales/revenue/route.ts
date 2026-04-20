import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db  = getServiceClient()
  const now = new Date()

  // Fetch won leads from last 13 months so we can compute trend
  const since = new Date(now.getFullYear() - 1, now.getMonth() - 1, 1)
  const { data, error } = await db
    .from('sales_leads')
    .select('estimated_value, updated_at')
    .eq('pipeline_stage', 'won')
    .gte('updated_at', since.toISOString())
    .not('estimated_value', 'is', null)

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
