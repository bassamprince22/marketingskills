import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { readSettings } from '@/lib/sales/autoAssign'

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const db   = getServiceClient()
  const user = session.user as { id?: string; role?: string }
  const role = user.role ?? 'rep'
  const uid  = user.id

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') // for manager: fetch all reports for a date
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  try {
    if (role === 'manager' || role === 'admin') {
      // Manager: get reports + full user list
      let q = db.from('sales_daily_reports')
        .select('*, sales_users!user_id(id, name, email, avatar_url)')
        .order('report_date', { ascending: false })

      if (date) q = q.eq('report_date', date)
      else if (from && to) q = q.gte('report_date', from).lte('report_date', to)
      else q = q.limit(200)

      const { data, error } = await q
      if (error && error.code !== '42P01') throw error

      const { data: reps } = await db.from('sales_users')
        .select('id, name, email, avatar_url, role')
        .eq('is_active', true)
        .in('role', ['rep', 'manager'])
        .order('name')

      return NextResponse.json({ reports: data ?? [], reps: reps ?? [] })
    } else {
      // Rep: own reports within retention window
      const cfg          = await readSettings(db)
      const retentionDays = cfg.daily_report.retention_days ?? 7
      const cutoff       = new Date()
      cutoff.setDate(cutoff.getDate() - retentionDays)
      const cutoffStr    = cutoff.toISOString().split('T')[0]

      const { data, error } = await db.from('sales_daily_reports')
        .select('*')
        .eq('user_id', uid)
        .gte('report_date', cutoffStr)
        .order('report_date', { ascending: false })

      if (error && error.code !== '42P01') throw error
      return NextResponse.json({ reports: data ?? [] })
    }
  } catch (e: unknown) {
    console.error(e)
    return err('Server error', 500)
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const user = session.user as { id?: string; role?: string }
  const uid  = user.id
  if (!uid) return err('No user id', 400)

  const db = getServiceClient()
  const body = await req.json()

  const {
    report_date,
    leads_total = 0,
    leads_qualified = 0,
    leads_waiting = 0,
    meetings_done = 0,
    proposals_sent = 0,
    contracts_generated = 0,
    won_today = 0,
    highlights,
    challenges,
    next_day_plan,
    custom_notes,
    status = 'draft',
  } = body

  if (!report_date) return err('report_date required')

  const payload: Record<string, unknown> = {
    user_id: uid,
    report_date,
    leads_total,
    leads_qualified,
    leads_waiting,
    meetings_done,
    proposals_sent,
    contracts_generated,
    won_today,
    highlights,
    challenges,
    next_day_plan,
    custom_notes,
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'submitted') payload.submitted_at = new Date().toISOString()

  try {
    const { data, error } = await db.from('sales_daily_reports')
      .upsert(payload, { onConflict: 'user_id,report_date' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ report: data })
  } catch (e: unknown) {
    console.error(e)
    return err('Server error', 500)
  }
}
