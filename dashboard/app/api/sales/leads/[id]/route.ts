import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLeadById, updateLead, deleteLead, logActivity } from '@/lib/sales/db'

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
