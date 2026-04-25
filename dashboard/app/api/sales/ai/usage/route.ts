import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = session.user as { orgId: string }

  const db = getServiceClient()
  const { data: org } = await db
    .from('orgs')
    .select('ai_calls_used, ai_calls_limit, plan')
    .eq('id', orgId)
    .single()

  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    used:      org.ai_calls_used,
    limit:     org.ai_calls_limit,
    remaining: Math.max(0, org.ai_calls_limit - org.ai_calls_used),
    plan:      org.plan,
    isTrial:   org.plan === 'trial',
  })
}
