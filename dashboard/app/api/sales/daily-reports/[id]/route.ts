import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const db   = getServiceClient()
  const user = session.user as { id?: string; role?: string }
  const role = user.role ?? 'rep'
  const uid  = user.id

  const { data, error } = await db.from('sales_daily_reports')
    .select('*, sales_users!user_id(id, name, avatar_url)')
    .eq('id', params.id)
    .single()

  if (error) return err('Not found', 404)
  if (role === 'rep' && data.user_id !== uid) return err('Forbidden', 403)

  return NextResponse.json({ report: data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const db   = getServiceClient()
  const user = session.user as { id?: string; role?: string }
  const role = user.role ?? 'rep'
  const uid  = user.id

  // Reps can only update their own
  if (role === 'rep') {
    const { data: existing } = await db.from('sales_daily_reports').select('user_id').eq('id', params.id).single()
    if (!existing || existing.user_id !== uid) return err('Forbidden', 403)
  }

  const body = await req.json()
  const payload: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() }
  if (body.status === 'submitted' && !body.submitted_at) {
    payload.submitted_at = new Date().toISOString()
  }

  const { data, error } = await db.from('sales_daily_reports')
    .update(payload)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return err(error.message, 500)
  return NextResponse.json({ report: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const db   = getServiceClient()
  const user = session.user as { id?: string; role?: string }
  const role = user.role ?? 'rep'
  const uid  = user.id

  if (role === 'rep') {
    const { data: existing } = await db.from('sales_daily_reports').select('user_id').eq('id', params.id).single()
    if (!existing || existing.user_id !== uid) return err('Forbidden', 403)
  }

  await db.from('sales_daily_reports').delete().eq('id', params.id)
  return NextResponse.json({ ok: true })
}
