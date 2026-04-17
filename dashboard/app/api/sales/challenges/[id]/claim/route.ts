import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

function err(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }) }

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)
  const user = session.user as { id?: string }
  if (!user.id) return err('No user id', 400)

  const body = await req.json()
  const { reward_id, amount_achieved } = body
  if (!reward_id) return err('reward_id required')

  const db = getServiceClient()

  // Get reward details
  const { data: reward, error: rerr } = await db.from('sales_challenge_rewards')
    .select('*').eq('id', reward_id).eq('challenge_id', params.id).single()

  if (rerr || !reward) return err('Reward not found', 404)

  // Check claim limits
  if (!reward.can_claim_multiple) {
    const { data: existing } = await db.from('sales_challenge_claims')
      .select('id').eq('reward_id', reward_id).eq('rep_id', user.id).limit(1)

    if (existing && existing.length > 0) return err('Already claimed this reward', 409)
  }

  if (reward.max_claims !== null) {
    const { count } = await db.from('sales_challenge_claims')
      .select('id', { count: 'exact', head: true })
      .eq('reward_id', reward_id)

    if ((count ?? 0) >= reward.max_claims) return err('Reward claim limit reached', 409)
  }

  const { data, error } = await db.from('sales_challenge_claims').insert({
    challenge_id:    params.id,
    reward_id,
    rep_id:          user.id,
    amount_achieved: amount_achieved ?? null,
  }).select().single()

  if (error) return err(error.message, 500)
  return NextResponse.json({ claim: data })
}
