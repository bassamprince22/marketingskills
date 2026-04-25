import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { z } from 'zod'

const lineItemSchema = z.object({
  sort_order:  z.number().int().default(0),
  description: z.string().min(1),
  qty:         z.number().min(0).default(1),
  unit:        z.string().default(''),
  rate:        z.number().min(0).default(0),
})

const putSchema = z.array(lineItemSchema)

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = session.user as { orgId: string }

  const db = getServiceClient()
  const { data: proposal } = await db.from('proposals').select('id').eq('id', id).eq('org_id', orgId).single()
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data } = await db.from('proposal_line_items').select('*').eq('proposal_id', id).order('sort_order')
  return NextResponse.json(data ?? [])
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = session.user as { orgId: string }

  const parsed = putSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid line items' }, { status: 400 })

  const db = getServiceClient()
  const { data: proposal } = await db.from('proposals').select('id').eq('id', id).eq('org_id', orgId).single()
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.from('proposal_line_items').delete().eq('proposal_id', id)

  if (parsed.data.length > 0) {
    await db.from('proposal_line_items').insert(
      parsed.data.map((item, i) => {
        const { sort_order: _, ...rest } = item
        return { ...rest, proposal_id: id, sort_order: i }
      })
    )
  }

  await db.from('proposals').update({ updated_at: new Date().toISOString() }).eq('id', id)

  const { data } = await db.from('proposal_line_items').select('*').eq('proposal_id', id).order('sort_order')
  return NextResponse.json(data ?? [])
}
