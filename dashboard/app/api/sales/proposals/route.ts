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

type DbErrorLike = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function normalizeDbError(error: unknown): DbErrorLike {
  if (error && typeof error === 'object') return error as DbErrorLike
  if (error instanceof Error) return { message: error.message }
  return { message: String(error ?? 'Unknown database error') }
}

function getSupabaseProjectRef() {
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname
    return host.endsWith('.supabase.co') ? host.replace('.supabase.co', '') : host
  } catch {
    return 'unknown'
  }
}

function missingProposalTablesPayload(error: unknown) {
  const dbError = normalizeDbError(error)
  const projectRef = getSupabaseProjectRef()
  const text = [
    dbError.code,
    dbError.message,
    dbError.details,
    dbError.hint,
  ].filter(Boolean).join(' ').toLowerCase()

  const missingTable =
    dbError.code === '42P01' ||
    dbError.code === 'PGRST205' ||
    text.includes('relation "proposals" does not exist') ||
    text.includes("relation 'proposals' does not exist") ||
    text.includes('could not find the table')

  if (!missingTable) return null

  const schemaCache =
    dbError.code === 'PGRST205' ||
    text.includes('schema cache')

  if (schemaCache) {
    return {
      error: 'Supabase schema cache has not reloaded the proposals tables yet.',
      details: `Production is connected to Supabase project "${projectRef}". If you already ran SELECT pg_notify('pgrst', 'reload schema') and this still appears, the SQL was likely run in a different Supabase project or the proposals table is not in the public schema.`,
      migration: "NOTIFY pgrst, 'reload schema';",
      projectRef,
      originalError: dbError.message,
    }
  }

  return {
    error: 'Proposals database tables are not installed yet.',
    details: `Production is connected to Supabase project "${projectRef}". Run dashboard/supabase/009_proposals_safe_install.sql in that exact project. If Supabase says orgs does not exist, run dashboard/supabase/006_multi_tenancy.sql first.`,
    migration: 'dashboard/supabase/009_proposals_safe_install.sql',
    projectRef,
    originalError: dbError.message,
  }
}

function proposalDbErrorResponse(error: unknown, fallback: string) {
  const installPayload = missingProposalTablesPayload(error)
  if (installPayload) return NextResponse.json(installPayload, { status: 503 })

  const dbError = normalizeDbError(error)
  return NextResponse.json({
    error: dbError.message ?? fallback,
    details: dbError.details ?? dbError.hint,
  }, { status: 500 })
}

async function nextProposalNumber(db: ReturnType<typeof getServiceClient>, orgId: string): Promise<string> {
  const { count, error } = await db
    .from('proposals')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
  if (error) throw error
  const n = (count ?? 0) + 1
  return `PROP-${String(n).padStart(5, '0')}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = session.user as { orgId: string }
  if (!orgId) return NextResponse.json({ error: 'Session expired - please sign in again' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')
  const isTemplate = searchParams.get('template') === '1'
  const limit      = Math.min(Number(searchParams.get('limit') ?? 50), 100)

  const db = getServiceClient()
  let q = db
    .from('proposals')
    .select('id, proposal_number, title, subtitle, status, proposal_date, valid_until, lead_id, is_template, created_at, updated_at')
    .eq('org_id', orgId)
    .eq('is_template', isTemplate)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return proposalDbErrorResponse(error, 'Failed to load proposals')
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, DEFAULT_LIMIT)
  if (limited) return limited

  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: userId, orgId } = session.user as { id: string; orgId: string }
  if (!orgId) return NextResponse.json({ error: 'Session expired - please sign in again' }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const db = getServiceClient()
  let proposalNumber: string
  try {
    proposalNumber = await nextProposalNumber(db, orgId)
  } catch (error) {
    return proposalDbErrorResponse(error, 'Failed to prepare proposal number')
  }

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

  if (error) return proposalDbErrorResponse(error, 'Failed to create proposal')
  return NextResponse.json(data, { status: 201 })
}
