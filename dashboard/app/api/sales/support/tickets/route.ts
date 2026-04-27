import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { sendSupportTicketEmail } from '@/lib/sales/supportEmail'

const ticketSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  category: z.enum(['bug', 'feature', 'billing', 'howto', 'other']).default('howto'),
  priority: z.enum(['normal', 'urgent']).default('normal'),
  message: z.string().trim().min(20).max(4000),
})

type SessionUser = {
  id: string
  name?: string | null
  email?: string | null
  role: string
  orgId: string
  orgName?: string | null
}

function supportTableMissing(error: unknown) {
  const maybe = error as { code?: string; message?: string } | null
  return maybe?.code === '42P01' || maybe?.message?.includes('support_tickets')
}

export async function GET() {
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
        support_messages(id, body, sender_type, sender_name, created_at)
      `)
      .eq('org_id', user.orgId)
      .order('last_message_at', { ascending: false })
      .limit(30)

    if (user.role === 'rep') query = query.eq('created_by', user.id)

    const { data, error } = await query
    if (error) throw error

    const tickets = (data ?? []).map((ticket) => {
      const messages = Array.isArray(ticket.support_messages) ? ticket.support_messages : []
      const lastMessage = messages
        .slice()
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
      return {
        ...ticket,
        message_count: messages.length,
        last_message: lastMessage ?? null,
        support_messages: undefined,
      }
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    if (supportTableMissing(error)) {
      return NextResponse.json({
        error: 'Support tables are not installed yet. Run dashboard/supabase/011_support_tickets.sql in Supabase.',
        setupRequired: true,
      }, { status: 503 })
    }
    console.error('Support tickets GET failed:', error)
    return NextResponse.json({ error: 'Failed to load support tickets' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as SessionUser

  const parsed = ticketSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please complete the support form before sending.' }, { status: 400 })
  }

  const db = getServiceClient()
  const { subject, category, priority, message } = parsed.data

  try {
    const { data: ticket, error: ticketError } = await db
      .from('support_tickets')
      .insert({
        org_id: user.orgId,
        created_by: user.id,
        subject,
        category,
        priority,
        status: 'open',
      })
      .select('id, subject, category, priority, status, created_at, updated_at, last_message_at')
      .single()

    if (ticketError) throw ticketError

    const { error: messageError } = await db
      .from('support_messages')
      .insert({
        ticket_id: ticket.id,
        org_id: user.orgId,
        sender_id: user.id,
        sender_type: 'customer',
        sender_name: user.name ?? 'Customer',
        sender_email: user.email ?? null,
        body: message,
      })

    if (messageError) throw messageError

    const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL
    const emailSent = await sendSupportTicketEmail({
      ticketId: ticket.id,
      subject,
      category,
      priority,
      orgName: user.orgName ?? 'Customer workspace',
      requesterName: user.name ?? 'Customer',
      requesterEmail: user.email,
      message,
      appUrl,
    })

    return NextResponse.json({ ticket, emailSent }, { status: 201 })
  } catch (error) {
    if (supportTableMissing(error)) {
      return NextResponse.json({
        error: 'Support tables are not installed yet. Run dashboard/supabase/011_support_tickets.sql in Supabase.',
        setupRequired: true,
      }, { status: 503 })
    }
    console.error('Support ticket POST failed:', error)
    return NextResponse.json({ error: 'Failed to create support ticket' }, { status: 500 })
  }
}
