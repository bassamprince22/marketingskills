import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

function err(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }) }

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const db = getServiceClient()

  // Get challenge details
  const { data: challenge, error: cerr } = await db.from('sales_challenges')
    .select('*, sales_challenge_rewards(*)')
    .eq('id', params.id)
    .single()

  if (cerr || !challenge) return err('Not found', 404)

  // Get all reps
  const { data: reps } = await db.from('sales_users')
    .select('id, name, avatar_url')
    .eq('is_active', true)
    .in('role', ['rep', 'manager'])
    .order('name')

  // Get won leads within challenge date range
  let leadsQ = db.from('sales_leads')
    .select('assigned_rep_id, estimated_value')
    .eq('pipeline_stage', 'won')
    .gte('updated_at', challenge.start_date)

  if (challenge.end_date) {
    leadsQ = leadsQ.lte('updated_at', challenge.end_date + 'T23:59:59')
  }

  const { data: wonLeads } = await leadsQ

  // Aggregate by rep
  const repMap: Record<string, { rep_id: string; name: string; avatar_url: string | null; amount: number }> = {}

  for (const rep of (reps ?? [])) {
    repMap[rep.id] = { rep_id: rep.id, name: rep.name, avatar_url: rep.avatar_url ?? null, amount: 0 }
  }

  for (const lead of (wonLeads ?? [])) {
    if (lead.assigned_rep_id && repMap[lead.assigned_rep_id]) {
      repMap[lead.assigned_rep_id].amount += Number(lead.estimated_value ?? 0)
    }
  }

  const leaderboard = Object.values(repMap)
    .sort((a, b) => b.amount - a.amount)
    .map((r, i) => ({ ...r, rank: i + 1 }))

  // Get claims
  const { data: claims } = await db.from('sales_challenge_claims')
    .select('*')
    .eq('challenge_id', params.id)

  return NextResponse.json({
    challenge,
    leaderboard,
    claims: claims ?? [],
    rewards: challenge.sales_challenge_rewards ?? [],
  })
}
