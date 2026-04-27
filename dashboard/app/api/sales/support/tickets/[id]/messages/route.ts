import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { sendSupportTicketEmail } from '@/lib/sales/supportEmail'

const messageSchema = z.object({
  message: z.string().trim().min(2).max(4000),
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
  return maybe?.code === '42P01' || maybe?.message?.includes('support_')
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as SessionUser
  const parsed = messageSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Message is required.' }, { status: 400 })

  const db = getServiceClient()
  try {
    let ticketQuery = db
      .from('support_tickets')
      .select('id, subject, category, priority, status, created_by')
      .eq('id', params.id)
      .eq('org_id', user.orgId)

    if (user.role === 'rep') ticketQuery = ticketQuery.eq('created_by', user.id)

    const { data: ticket, error: ticketError } = await ticketQuery.single()
    if (ticketError) throw ticketError
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const now = new Date().toISOString()
    const { data: message, error: messageError } = await db
      .from('support_messages')
      .insert({
        ticket_id: ticket.id,
        org_id: user.orgId,
        sender_id: user.id,
        sender_type: 'customer',
        sender_name: user.name ?? 'Customer',
        sender_email: user.email ?? null,
        body: parsed.data.message,
      })
      .select('id, body, sender_type, sender_name, sender_email, created_at')
      .single()

    if (messageError) throw messageError

    await db
      .from('support_tickets')
      .update({
        status: ticket.status === 'closed' ? 'open' : ticket.status,
        updated_at: now,
        last_message_at: now,
      })
      .eq('id', ticket.id)

    const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL
    const emailSent = await sendSupportTicketEmail({
      ticketId: ticket.id,
      subject: `Reply: ${ticket.subject}`,
      category: ticket.category,
      priority: ticket.priority,
      orgName: user.orgName ?? 'Customer workspace',
      requesterName: user.name ?? 'Customer',
      requesterEmail: user.email,
      message: parsed.data.message,
      appUrl,
    })

    return NextResponse.json({ message, emailSent }, { status: 201 })
  } catch (error) {
    if (supportTableMissing(error)) {
      return NextResponse.json({
        error: 'Support tables are not installed yet. Run dashboard/supabase/011_support_tickets.sql in Supabase.',
        setupRequired: true,
      }, { status: 503 })
    }
    console.error('Support message POST failed:', error)
    return NextResponse.json({ error: 'Failed to send support message' }, { status: 500 })
  }
}
