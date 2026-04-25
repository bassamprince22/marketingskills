import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { z } from 'zod'

const adjSchema  = z.object({
  adj_type:   z.enum(['tax', 'discount', 'adjustment']),
  label:      z.string().min(1),
  value_type: z.enum(['percent', 'fixed']).default('percent'),
  value:      z.number().min(0),
})
const putSchema = z.array(adjSchema)

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = session.user as { orgId: string }

  const db = getServiceClient()
  const { data: proposal } = await db.from('proposals').select('id').eq('id', id).eq('org_id', orgId).single()
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data } = await db.from('proposal_adjustments').select('*').eq('proposal_id', id)
  return NextResponse.json(data ?? [])
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = session.user as { orgId: string }

  const parsed = putSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid adjustments' }, { status: 400 })

  const db = getServiceClient()
  const { data: proposal } = await db.from('proposals').select('id').eq('id', id).eq('org_id', orgId).single()
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.from('proposal_adjustments').delete().eq('proposal_id', id)
  if (parsed.data.length > 0) {
    await db.from('proposal_adjustments').insert(parsed.data.map(a => ({ proposal_id: id, ...a })))
  }

  const { data } = await db.from('proposal_adjustments').select('*').eq('proposal_id', id)
  return NextResponse.json(data ?? [])
}
