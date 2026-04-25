import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = session.user as { orgId: string }

  const db = getServiceClient()

  const [{ data: org }, { count: seatsUsed }] = await Promise.all([
    db.from('orgs')
      .select('plan, trial_ends_at, status, ai_calls_used, ai_calls_limit, seats_limit')
      .eq('id', orgId)
      .single(),
    db.from('sales_users')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('is_active', true),
  ])

  return NextResponse.json({
    plan:           org?.plan ?? 'trial',
    trial_ends_at:  org?.trial_ends_at ?? null,
    status:         org?.status ?? 'active',
    ai_calls_used:  org?.ai_calls_used ?? 0,
    ai_calls_limit: org?.ai_calls_limit ?? 0,
    seats_used:     seatsUsed ?? 0,
    seats_limit:    org?.seats_limit ?? 5,
  })
}
