import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { z } from 'zod'
import { checkRateLimit, DEFAULT_LIMIT } from '@/lib/rateLimit'

const createSchema = z.object({
  lead_id:       z.string().uuid().optional(),
  title:         z.string().min(1).max(200),
  subtitle:      z.string().max(300).optional(),
  status:        z.enum(['new', 'draft', 'sent', 'accepted', 'declined', 'revised']).default('new'),
  category:      z.string().max(80).default('default'),
  proposal_date: z.string().optional(),
  valid_until:   z.string().optional(),
  cover_color:   z.string().max(20).default('#7C3AED'),
  body_html:     z.string().optional(),
  is_template:   z.boolean().default(false),
})

async function nextProposalNumber(db: ReturnType<typeof getServiceClient>, orgId: string): Promise<string> {
  const { count } = await db
    .from('proposals')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
  const n = (count ?? 0) + 1
  return `PROP-${String(n).padStart(5, '0')}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = session.user as { orgId: string }
  if (!orgId) return NextResponse.json({ error: 'Session expired — please sign in again' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')
  const isTemplate = searchParams.get('template') === '1'
  const limit      = Math.min(Number(searchParams.get('limit') ?? 50), 100)

  const db = getServiceClient()
  let q = db
    .from('proposals')
    .select('id, proposal_number, title, subtitle, status, proposal_date, valid_until, lead_id, is_template, created_at, updated_at, sales_leads(company_name, contact_person)')
    .eq('org_id', orgId)
    .eq('is_template', isTemplate)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, DEFAULT_LIMIT)
  if (limited) return limited

  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: userId, orgId } = session.user as { id: string; orgId: string }
  if (!orgId) return NextResponse.json({ error: 'Session expired — please sign in again' }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const db = getServiceClient()
  const proposalNumber = await nextProposalNumber(db, orgId)

  const { data, error } = await db
    .from('proposals')
    .insert({
      org_id:          orgId,
      proposal_number: proposalNumber,
      prepared_by:     userId,
      ...parsed.data,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
