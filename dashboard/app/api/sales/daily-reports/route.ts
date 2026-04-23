import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { readSettings } from '@/lib/sales/autoAssign'
import { getEffectiveModulePermission } from '@/lib/sales/db'

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

const TODAY = new Date().toISOString().split('T')[0]

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const db = getServiceClient()
  const user = session.user as { id?: string; role?: string }
  const role = user.role ?? 'rep'
  const uid = user.id
  if (!uid) return err('No user id', 400)

  const reportsPermission = await getEffectiveModulePermission(uid, role, 'reports')
  if (!reportsPermission.can_view) return err('Forbidden', 403)

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const targetUserId = searchParams.get('userId')

  try {
    if (reportsPermission.can_manage) {
      let query = db
        .from('sales_daily_reports')
        .select('*, sales_users!user_id(id, name, email, avatar_url)')
        .order('report_date', { ascending: false })

      if (targetUserId) query = query.eq('user_id', targetUserId)
      if (date) query = query.eq('report_date', date)
      else if (from && to) query = query.gte('report_date', from).lte('report_date', to)
      else query = query.limit(200)

      const { data, error } = await query
      if (error && error.code !== '42P01') throw error

      const { data: reps } = await db.from('sales_users')
        .select('id, name, email, avatar_url, role')
        .eq('is_active', true)
        .in('role', ['rep', 'manager'])
        .order('name')

      return NextResponse.json({
        reports: data ?? [],
        reps: reps ?? [],
        permissions: reportsPermission,
      })
    }

    const cfg = await readSettings(db)
    const retentionDays = cfg.daily_report.retention_days ?? 7
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - retentionDays)
    const cutoffStr = cutoff.toISOString().split('T')[0]

    let query = db.from('sales_daily_reports')
      .select('*')
      .eq('user_id', uid)
      .order('report_date', { ascending: false })

    if (date) query = query.eq('report_date', date)
    else if (from && to) query = query.gte('report_date', from).lte('report_date', to)
    else query = query.gte('report_date', cutoffStr)

    const { data, error } = await query
    if (error && error.code !== '42P01') throw error

    return NextResponse.json({
      reports: data ?? [],
      permissions: reportsPermission,
    })
  } catch (error) {
    console.error(error)
    return err('Server error', 500)
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const user = session.user as { id?: string; role?: string }
  const uid = user.id
  const role = user.role ?? 'rep'
  if (!uid) return err('No user id', 400)

  const reportsPermission = await getEffectiveModulePermission(uid, role, 'reports')
  if (!reportsPermission.can_create) return err('Forbidden', 403)

  const db = getServiceClient()
  const body = await req.json()
  const reportDate = body.report_date as string | undefined
  const targetUserId = role === 'admin' ? body.user_id ?? uid : uid

  if (!reportDate) return err('report_date required')
  if (role !== 'admin' && reportDate !== TODAY) {
    return err('Only today\'s report can be created here', 403)
  }

  const payload: Record<string, unknown> = {
    user_id: targetUserId,
    report_date: reportDate,
    leads_total: body.leads_total ?? 0,
    leads_qualified: body.leads_qualified ?? 0,
    leads_waiting: body.leads_waiting ?? 0,
    meetings_done: body.meetings_done ?? 0,
    proposals_sent: body.proposals_sent ?? 0,
    contracts_generated: body.contracts_generated ?? 0,
    won_today: body.won_today ?? 0,
    highlights: body.highlights,
    challenges: body.challenges,
    next_day_plan: body.next_day_plan,
    custom_notes: body.custom_notes,
    status: body.status ?? 'draft',
    updated_at: new Date().toISOString(),
  }
  if (payload.status === 'submitted') payload.submitted_at = new Date().toISOString()

  try {
    const { data, error } = await db.from('sales_daily_reports')
      .upsert(payload, { onConflict: 'user_id,report_date' })
      .select('*, sales_users!user_id(id, name, email, avatar_url)')
      .single()

    if (error) throw error
    return NextResponse.json({ report: data })
  } catch (error) {
    console.error(error)
    return err('Server error', 500)
  }
}
