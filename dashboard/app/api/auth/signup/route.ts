import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getServiceClient } from '@/lib/supabase'

const schema = z.object({
  agencyName: z.string().min(1).max(120),
  fullName:   z.string().min(1).max(120),
  email:      z.string().email(),
  password:   z.string().min(8).max(128),
  plan:       z.enum(['starter', 'pro', 'enterprise']).default('pro'),
})

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

const AI_LIMITS: Record<string, number> = {
  starter:    0,
  pro:        100,
  enterprise: 9999,
}

const SEAT_LIMITS: Record<string, number> = {
  starter:    3,
  pro:        10,
  enterprise: 9999,
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { agencyName, fullName, email, password, plan } = parsed.data
  const db = getServiceClient()

  // Duplicate email check
  const { data: existingUser } = await db
    .from('sales_users')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 })
  }

  // Generate unique slug
  let slug = toSlug(agencyName)
  const { data: slugConflict } = await db.from('orgs').select('id').eq('slug', slug).single()
  if (slugConflict) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

  // Create org
  const { data: org, error: orgErr } = await db
    .from('orgs')
    .insert({
      name:          agencyName,
      slug,
      plan:          'trial',
      trial_ends_at: trialEndsAt.toISOString(),
      seats_limit:   SEAT_LIMITS[plan] ?? 5,
      ai_calls_limit: AI_LIMITS[plan] ?? 0,
      status:        'active',
    })
    .select()
    .single()

  if (orgErr || !org) {
    console.error('Org creation error:', orgErr)
    return NextResponse.json({ error: 'Failed to create workspace.' }, { status: 500 })
  }

  // Hash password + create admin user
  const passwordHash = await bcrypt.hash(password, 12)
  const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + org.id.slice(0, 4)

  const { data: user, error: userErr } = await db
    .from('sales_users')
    .insert({
      org_id:        org.id,
      name:          fullName,
      email,
      username,
      password_hash: passwordHash,
      role:          'admin',
      is_active:     true,
    })
    .select()
    .single()

  if (userErr || !user) {
    console.error('User creation error:', userErr)
    // Rollback org
    await db.from('orgs').delete().eq('id', org.id)
    return NextResponse.json({ error: 'Failed to create user account.' }, { status: 500 })
  }

  // Create onboarding record
  await db.from('org_onboarding').insert({
    org_id:           org.id,
    survey_completed: false,
    brand_set:        false,
    template_created: false,
    first_lead:       false,
    team_invited:     false,
    meta_connected:   false,
  })

  return NextResponse.json({ ok: true, redirect: '/onboarding/survey' }, { status: 201 })
}
