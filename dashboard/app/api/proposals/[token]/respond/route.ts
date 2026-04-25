import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { z } from 'zod'

const schema = z.object({
  action: z.enum(['accepted', 'declined']),
  reason: z.string().max(500).optional(),
})

type Params = { params: Promise<{ token: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const db = getServiceClient()
  const { data: proposal } = await db
    .from('proposals')
    .select('id, org_id, lead_id, proposal_number, status')
    .eq('public_token', token)
    .single()

  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  if (['accepted', 'declined'].includes(proposal.status)) {
    return NextResponse.json({ error: 'Proposal already responded to', status: proposal.status }, { status: 409 })
  }

  await db.from('proposals').update({
    status:     parsed.data.action,
    updated_at: new Date().toISOString(),
  }).eq('id', proposal.id)

  if (proposal.lead_id) {
    await db.from('sales_activities').insert({
      org_id:      proposal.org_id,
      lead_id:     proposal.lead_id,
      action_type: 'note',
      description: `Client ${parsed.data.action} proposal ${proposal.proposal_number}${parsed.data.reason ? ': ' + parsed.data.reason : ''}`,
      metadata:    { proposal_id: proposal.id, action: parsed.data.action },
      created_at:  new Date().toISOString(),
    })

    if (parsed.data.action === 'accepted') {
      await db.from('sales_leads').update({ pipeline_stage: 'closed_won' }).eq('id', proposal.lead_id)
    }
  }

  return NextResponse.json({ ok: true, status: parsed.data.action })
}
