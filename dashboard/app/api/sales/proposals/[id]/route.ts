import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { z } from 'zod'
import { logActivity } from '@/lib/sales/db'

const patchSchema = z.object({
  title:         z.string().min(1).max(200).optional(),
  subtitle:      z.string().max(300).optional(),
  status:        z.enum(['new', 'draft', 'sent', 'accepted', 'declined', 'revised']).optional(),
  category:      z.string().max(80).optional(),
  proposal_date: z.string().optional(),
  valid_until:   z.string().optional(),
  cover_color:   z.string().max(20).optional(),
  body_html:     z.string().optional(),
  lead_id:       z.string().uuid().optional(),
  is_template:   z.boolean().optional(),
}).strict()

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = session.user as { orgId: string }

  const db = getServiceClient()
  const { data, error } = await db
    .from('proposals')
    .select(`
      *,
      sales_leads(id, company_name, contact_person, email, phone),
      proposal_line_items(id, sort_order, description, qty, unit, rate),
      proposal_adjustments(id, adj_type, label, value_type, value)
    `)
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: userId, orgId } = session.user as { id: string; orgId: string }

  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const db = getServiceClient()
  const { data, error } = await db
    .from('proposals')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 })

  if (parsed.data.status) {
    await logActivity({
      org_id:      orgId,
      lead_id:     data.lead_id ?? '',
      user_id:     userId,
      action_type: 'note_added',
      description: `Proposal ${data.proposal_number} marked as ${parsed.data.status}`,
      metadata:    { proposal_id: id, status: parsed.data.status },
    })
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = session.user as { orgId: string }

  const db = getServiceClient()
  const { error } = await db.from('proposals').delete().eq('id', id).eq('org_id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
