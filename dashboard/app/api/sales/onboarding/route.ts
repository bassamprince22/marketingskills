import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = session.user as { orgId: string }

  const db = getServiceClient()

  const [{ data: org }, { data: onboarding }] = await Promise.all([
    db.from('orgs').select('plan, trial_ends_at, name, status').eq('id', orgId).single(),
    db.from('org_onboarding').select('*').eq('org_id', orgId).single(),
  ])

  return NextResponse.json({
    plan:          org?.plan ?? 'trial',
    trial_ends_at: org?.trial_ends_at ?? null,
    org_name:      org?.name ?? '',
    status:        org?.status ?? 'active',
    ...(onboarding ?? {}),
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = session.user as { orgId: string }

  const body = await req.json()
  const db = getServiceClient()

  const allowedOrgFields = ['name', 'brand_color', 'logo_url']
  const allowedOnboardingFields = [
    'brand_set', 'template_created', 'first_lead',
    'team_invited', 'meta_connected', 'welcome_shown', 'checklist_dismissed',
  ]

  const orgUpdate: Record<string, unknown> = {}
  const onboardingUpdate: Record<string, unknown> = {}

  if (body.agencyName) orgUpdate.name = body.agencyName
  if (body.brandColor)  orgUpdate.brand_color = body.brandColor
  if (body.logoUrl)     orgUpdate.logo_url = body.logoUrl

  for (const field of allowedOnboardingFields) {
    if (body[field] !== undefined) onboardingUpdate[field] = body[field]
  }

  // Handle step shortcuts
  if (body.step === 'brand_set')     onboardingUpdate.brand_set = true
  if (body.step === 'first_lead')    onboardingUpdate.first_lead = true
  if (body.step === 'team_invited')  onboardingUpdate.team_invited = true
  if (body.step === 'meta_connected') onboardingUpdate.meta_connected = true

  const promises = []
  if (Object.keys(orgUpdate).length) {
    promises.push(db.from('orgs').update(orgUpdate).eq('id', orgId))
  }
  if (Object.keys(onboardingUpdate).length) {
    promises.push(
      db.from('org_onboarding')
        .upsert({ org_id: orgId, ...onboardingUpdate }, { onConflict: 'org_id' })
    )
  }

  await Promise.all(promises)
  return NextResponse.json({ ok: true })
}
