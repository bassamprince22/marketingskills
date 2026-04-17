import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

function err(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }) }

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const user = session.user as { id?: string; role?: string }
  const role = user.role ?? 'rep'
  if (!['manager','admin'].includes(role)) return err('Forbidden', 403)

  const body = await req.json()
  const db   = getServiceClient()

  const updates: Record<string, unknown> = {}
  if (body.status) updates.status = body.status
  if (body.status === 'approved') {
    updates.approved_by = user.id
    updates.approved_at = new Date().toISOString()
  }
  if (body.status === 'paid') {
    updates.paid_at = new Date().toISOString()
  }

  const { data, error } = await db.from('sales_commissions')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return err(error.message, 500)
  return NextResponse.json({ commission: data })
}
