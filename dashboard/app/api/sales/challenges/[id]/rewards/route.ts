import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

function err(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }) }

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const db = getServiceClient()
  const { data, error } = await db.from('sales_challenge_rewards')
    .select('*')
    .eq('challenge_id', params.id)
    .order('rank')

  if (error && error.code !== '42P01') return err(error.message, 500)
  return NextResponse.json({ rewards: data ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)
  const user = session.user as { role?: string }
  if (!['admin','manager'].includes(user.role ?? '')) return err('Forbidden', 403)

  const body = await req.json()
  const db   = getServiceClient()

  // Support bulk upsert (replace all rewards for challenge)
  if (Array.isArray(body.rewards)) {
    await db.from('sales_challenge_rewards').delete().eq('challenge_id', params.id)
    if (body.rewards.length > 0) {
      const { data, error } = await db.from('sales_challenge_rewards').insert(
        body.rewards.map((r: Record<string, unknown>, i: number) => ({
          challenge_id:       params.id,
          rank:               r.rank ?? i + 1,
          title:              r.title,
          description:        r.description ?? null,
          cash_amount:        r.cash_amount ?? null,
          badge_emoji:        r.badge_emoji ?? null,
          badge_color:        r.badge_color ?? null,
          can_claim_multiple: r.can_claim_multiple ?? false,
          max_claims:         r.max_claims ?? null,
        }))
      ).select()
      if (error) return err(error.message, 500)
      return NextResponse.json({ rewards: data })
    }
    return NextResponse.json({ rewards: [] })
  }

  // Single reward
  const { data, error } = await db.from('sales_challenge_rewards').insert({
    challenge_id:       params.id,
    rank:               body.rank ?? 1,
    title:              body.title,
    description:        body.description ?? null,
    cash_amount:        body.cash_amount ?? null,
    badge_emoji:        body.badge_emoji ?? null,
    badge_color:        body.badge_color ?? null,
    can_claim_multiple: body.can_claim_multiple ?? false,
    max_claims:         body.max_claims ?? null,
  }).select().single()

  if (error) return err(error.message, 500)
  return NextResponse.json({ reward: data })
}
