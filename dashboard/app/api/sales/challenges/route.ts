import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

function err(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }) }

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const db = getServiceClient()
  const { data, error } = await db.from('sales_challenges')
    .select('*, sales_challenge_rewards(*)')
    .order('created_at', { ascending: false })

  if (error && error.code !== '42P01') return err(error.message, 500)
  return NextResponse.json({ challenges: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)
  const user = session.user as { id?: string; role?: string }
  if (!['admin','manager'].includes(user.role ?? '')) return err('Forbidden', 403)

  const body = await req.json()
  if (!body.title || !body.start_date) return err('title and start_date required')

  const db = getServiceClient()
  const { data, error } = await db.from('sales_challenges').insert({
    title:                 body.title,
    description:           body.description ?? null,
    target_amount:         body.target_amount ?? null,
    start_date:            body.start_date,
    end_date:              body.end_date ?? null,
    is_active:             body.is_active ?? false,
    transparent:           body.transparent ?? true,
    top_achievers_visible: body.top_achievers_visible ?? true,
    created_by:            user.id,
  }).select().single()

  if (error) return err(error.message, 500)
  return NextResponse.json({ challenge: data })
}
