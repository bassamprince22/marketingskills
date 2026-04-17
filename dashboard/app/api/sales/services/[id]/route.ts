import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

function err(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }) }

function privileged(role: string) { return ['manager','admin'].includes(role) }

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)
  const user = session.user as { role?: string }
  if (!privileged(user.role ?? '')) return err('Forbidden', 403)

  const body = await req.json()
  const db   = getServiceClient()
  const { data, error } = await db.from('sales_services')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return err(error.message, 500)
  return NextResponse.json({ service: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)
  const user = session.user as { role?: string }
  if (!privileged(user.role ?? '')) return err('Forbidden', 403)

  const db = getServiceClient()
  await db.from('sales_services').delete().eq('id', params.id)
  return NextResponse.json({ ok: true })
}
