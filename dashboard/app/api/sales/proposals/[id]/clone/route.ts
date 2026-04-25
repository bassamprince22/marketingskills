import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { z } from 'zod'

const schema = z.object({
  title:         z.string().min(1).max(200),
  lead_id:       z.string().uuid().optional(),
  proposal_date: z.string().optional(),
  valid_until:   z.string().optional(),
  category:      z.string().max(80).optional(),
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

  const { data: source } = await db
    .from('proposals')
    .select('*, proposal_line_items(*), proposal_adjustments(*)')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (!source) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  const { count } = await db.from('proposals').select('id', { count: 'exact', head: true }).eq('org_id', orgId)
  const proposalNumber = `PROP-${String((count ?? 0) + 1).padStart(5, '0')}`

  const { data: clone, error } = await db
    .from('proposals')
    .insert({
      org_id:          orgId,
      proposal_number: proposalNumber,
      prepared_by:     userId,
      lead_id:         parsed.data.lead_id ?? source.lead_id,
      title:           parsed.data.title,
      subtitle:        source.subtitle,
      status:          'new',
      category:        parsed.data.category ?? source.category,
      proposal_date:   parsed.data.proposal_date ?? new Date().toISOString().slice(0, 10),
      valid_until:     parsed.data.valid_until ?? source.valid_until,
      cover_color:     source.cover_color,
      body_html:       source.body_html,
      is_template:     false,
    })
    .select()
    .single()

  if (error || !clone) return NextResponse.json({ error: error?.message }, { status: 500 })

  if (source.proposal_line_items?.length) {
    await db.from('proposal_line_items').insert(
      source.proposal_line_items.map(({ id: _id, proposal_id: _pid, ...rest }: Record<string, unknown>) => ({
        ...rest, proposal_id: clone.id,
      }))
    )
  }
  if (source.proposal_adjustments?.length) {
    await db.from('proposal_adjustments').insert(
      source.proposal_adjustments.map(({ id: _id, proposal_id: _pid, ...rest }: Record<string, unknown>) => ({
        ...rest, proposal_id: clone.id,
      }))
    )
  }

  return NextResponse.json(clone, { status: 201 })
}
