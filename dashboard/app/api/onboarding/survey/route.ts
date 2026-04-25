import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { z } from 'zod'

const schema = z.object({
  agency_type:  z.string().optional(),
  team_size:    z.string().optional(),
  primary_goal: z.string().optional(),
  current_tool: z.string().optional(),
  hear_about:   z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = session.user as { orgId: string }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const db = getServiceClient()
  const { error } = await db
    .from('org_onboarding')
    .upsert({
      org_id:           orgId,
      survey_completed: true,
      agency_type:      parsed.data.agency_type,
      team_size:        parsed.data.team_size,
      primary_goal:     parsed.data.primary_goal,
      current_tool:     parsed.data.current_tool,
      hear_about:       parsed.data.hear_about,
    }, { onConflict: 'org_id' })

  if (error) {
    console.error('Survey save error:', error)
    return NextResponse.json({ error: 'Failed to save survey' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
