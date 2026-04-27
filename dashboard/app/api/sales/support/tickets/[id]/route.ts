import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

type SessionUser = {
  id: string
  role: string
  orgId: string
}

function supportTableMissing(error: unknown) {
  const maybe = error as { code?: string; message?: string } | null
  return maybe?.code === '42P01' || maybe?.message?.includes('support_tickets')
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as SessionUser
  const db = getServiceClient()

  try {
    let query = db
      .from('support_tickets')
      .select(`
        id,
        subject,
        category,
        priority,
        status,
        created_by,
        created_at,
        updated_at,
        last_message_at,
        support_messages(id, body, sender_type, sender_name, sender_email, created_at)
      `)
      .eq('id', params.id)
      .eq('org_id', user.orgId)

    if (user.role === 'rep') query = query.eq('created_by', user.id)

    const { data, error } = await query.single()
    if (error) throw error

    const messages = Array.isArray(data.support_messages)
      ? data.support_messages.slice().sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      : []

    return NextResponse.json({ ticket: { ...data, support_messages: messages } })
  } catch (error) {
    if (supportTableMissing(error)) {
      return NextResponse.json({
        error: 'Support tables are not installed yet. Run dashboard/supabase/011_support_tickets.sql in Supabase.',
        setupRequired: true,
      }, { status: 503 })
    }
    console.error('Support ticket detail failed:', error)
    return NextResponse.json({ error: 'Failed to load support ticket' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as SessionUser
  const body = await req.json().catch(() => ({}))
  const nextStatus = body.status
  if (!['open', 'in_progress', 'resolved', 'closed'].includes(nextStatus)) {
    return NextResponse.json({ error: 'Invalid support status' }, { status: 400 })
  }

  const db = getServiceClient()
  try {
    let query = db
      .from('support_tickets')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('org_id', user.orgId)

    if (user.role === 'rep') query = query.eq('created_by', user.id)

    const { error } = await query
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (supportTableMissing(error)) {
      return NextResponse.json({
        error: 'Support tables are not installed yet. Run dashboard/supabase/011_support_tickets.sql in Supabase.',
        setupRequired: true,
      }, { status: 503 })
    }
    console.error('Support ticket PATCH failed:', error)
    return NextResponse.json({ error: 'Failed to update support ticket' }, { status: 500 })
  }
}
