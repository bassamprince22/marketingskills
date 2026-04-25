import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { z } from 'zod'

const schema = z.object({
  to:      z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: userId, orgId } = session.user as { id: string; orgId: string }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const db = getServiceClient()
  const { data: proposal } = await db
    .from('proposals')
    .select('id, proposal_number, title, public_token, lead_id')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const publicUrl = `${process.env.NEXTAUTH_URL}/p/${proposal.public_token}`
  const resendKey = process.env.RESEND_API_KEY

  if (resendKey) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendKey)
      await resend.emails.send({
        from:    process.env.FROM_EMAIL ?? 'proposals@fadaa.io',
        to:      parsed.data.to,
        subject: parsed.data.subject,
        html: `
          <p>${parsed.data.message ?? `Please review the proposal: ${proposal.title}`}</p>
          <p><a href="${publicUrl}" style="background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Proposal</a></p>
          <p style="color:#999;font-size:12px;">Or copy this link: ${publicUrl}</p>
        `,
      })
    } catch (err) {
      console.error('Email send error:', err)
    }
  }

  // Mark as sent
  await db.from('proposals').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', id)
  await db.from('sales_activities').insert({
    org_id:      orgId,
    lead_id:     proposal.lead_id,
    user_id:     userId,
    action_type: 'note',
    description: `Proposal ${proposal.proposal_number} sent to ${parsed.data.to}`,
    metadata:    { proposal_id: id },
    created_at:  new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, publicUrl })
}
