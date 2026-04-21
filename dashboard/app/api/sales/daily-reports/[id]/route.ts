import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { getEffectiveModulePermission } from '@/lib/sales/db'

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

const TODAY = new Date().toISOString().split('T')[0]

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const db = getServiceClient()
  const user = session.user as { id?: string; role?: string }
  const uid = user.id
  const role = user.role ?? 'rep'
  if (!uid) return err('No user id', 400)

  const reportsPermission = await getEffectiveModulePermission(uid, role, 'reports')
  if (!reportsPermission.can_view) return err('Forbidden', 403)

  const { data, error } = await db.from('sales_daily_reports')
    .select('*, sales_users!user_id(id, name, email, avatar_url)')
    .eq('id', params.id)
    .single()

  if (error) return err('Not found', 404)
  if (!reportsPermission.can_manage && data.user_id !== uid) return err('Forbidden', 403)

  return NextResponse.json({ report: data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const db = getServiceClient()
  const user = session.user as { id?: string; role?: string }
  const uid = user.id
  const role = user.role ?? 'rep'
  if (!uid) return err('No user id', 400)

  const reportsPermission = await getEffectiveModulePermission(uid, role, 'reports')
  if (!reportsPermission.can_edit && !(role === 'admin' && reportsPermission.can_manage)) {
    return err('Forbidden', 403)
  }

  const { data: existing } = await db.from('sales_daily_reports')
    .select('id, user_id, report_date')
    .eq('id', params.id)
    .single()

  if (!existing) return err('Not found', 404)
  if (!(role === 'admin' && reportsPermission.can_manage) && existing.user_id !== uid) {
    return err('Forbidden', 403)
  }
  if (role !== 'admin' && existing.report_date !== TODAY) {
    return err('Only today\'s report can be edited here', 403)
  }

  const body = await req.json()
  if (role !== 'admin' && body.report_date && body.report_date !== TODAY) {
    return err('Only today\'s report can be edited here', 403)
  }

  const payload: Record<string, unknown> = {
    ...body,
    updated_at: new Date().toISOString(),
  }
  if (body.status === 'submitted' && !body.submitted_at) {
    payload.submitted_at = new Date().toISOString()
  }

  const { data, error } = await db.from('sales_daily_reports')
    .update(payload)
    .eq('id', params.id)
    .select('*, sales_users!user_id(id, name, email, avatar_url)')
    .single()

  if (error) return err(error.message, 500)
  return NextResponse.json({ report: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const db = getServiceClient()
  const user = session.user as { id?: string; role?: string }
  const uid = user.id
  const role = user.role ?? 'rep'
  if (!uid) return err('No user id', 400)

  const reportsPermission = await getEffectiveModulePermission(uid, role, 'reports')
  if (!reportsPermission.can_delete && !(role === 'admin' && reportsPermission.can_manage)) {
    return err('Forbidden', 403)
  }

  if (!(role === 'admin' && reportsPermission.can_manage)) {
    const { data: existing } = await db.from('sales_daily_reports').select('user_id').eq('id', params.id).single()
    if (!existing || existing.user_id !== uid) return err('Forbidden', 403)
  }

  await db.from('sales_daily_reports').delete().eq('id', params.id)
  return NextResponse.json({ ok: true })
}
