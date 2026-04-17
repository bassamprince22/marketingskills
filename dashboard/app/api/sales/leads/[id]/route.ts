import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLeadById, updateLead, deleteLead, logActivity } from '@/lib/sales/db'
import { getServiceClient } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: userId, role } = session.user as { id: string; role: string }

  const lead = await getLeadById(params.id)
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (role === 'rep' && lead.assigned_rep_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ lead })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: userId, role } = session.user as { id: string; role: string }

  const lead = await getLeadById(params.id)
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (role === 'rep' && lead.assigned_rep_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    // Reps cannot reassign leads
    if (role === 'rep') delete body.assigned_rep_id
    const updated = await updateLead(params.id, body)

    // Auto-create commission when lead is marked won
    if (body.pipeline_stage === 'won' && lead.pipeline_stage !== 'won') {
      try {
        const db        = getServiceClient()
        const updatedAny = updated as unknown as Record<string, unknown>
        const repId      = (updatedAny.assigned_rep_id as string | null) ?? userId
        const dealValue  = Number(updatedAny.estimated_value ?? 0)

        // Try to find service by service_id or name match
        let commPct = 0
        let serviceId: string | null = null

        if (updatedAny.service_id) {
          const { data: svc } = await db.from('sales_services').select('id, commission_pct').eq('id', updatedAny.service_id).single()
          if (svc) { commPct = Number(svc.commission_pct); serviceId = svc.id }
        } else if (updatedAny.service_type) {
          const { data: svc } = await db.from('sales_services').select('id, commission_pct').ilike('name', updatedAny.service_type as string).eq('is_enabled', true).limit(1).single()
          if (svc) { commPct = Number(svc.commission_pct); serviceId = svc.id }
        }

        if (dealValue > 0 && commPct > 0) {
          await db.from('sales_commissions').insert({
            lead_id:           params.id,
            rep_id:            repId,
            service_id:        serviceId,
            deal_value:        dealValue,
            commission_pct:    commPct,
            commission_amount: Math.round((dealValue * commPct / 100) * 100) / 100,
            status:            'pending',
          })
        }
      } catch (e) {
        console.error('commission auto-create failed:', e)
      }
    }

    if (body.notes) {
      await logActivity({ lead_id: params.id, user_id: userId, action_type: 'note_added', description: 'Updated notes' })
    }
    return NextResponse.json({ lead: updated })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role === 'rep') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await deleteLead(params.id)
  return NextResponse.json({ ok: true })
}
