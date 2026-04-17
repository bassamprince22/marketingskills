import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

function err(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }) }

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const db = getServiceClient()
  const { data, error } = await db.from('sales_challenges')
    .select('*, sales_challenge_rewards(*)')
    .eq('id', params.id)
    .single()

  if (error) return err('Not found', 404)
  return NextResponse.json({ challenge: data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)
  const user = session.user as { role?: string }
  if (!['admin','manager'].includes(user.role ?? '')) return err('Forbidden', 403)

  const body = await req.json()
  const db   = getServiceClient()

  const { data, error } = await db.from('sales_challenges')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return err(error.message, 500)
  return NextResponse.json({ challenge: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)
  const user = session.user as { role?: string }
  if (user.role !== 'admin') return err('Forbidden', 403)

  const db = getServiceClient()
  await db.from('sales_challenges').delete().eq('id', params.id)
  return NextResponse.json({ ok: true })
}
