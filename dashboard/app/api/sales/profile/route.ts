import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserProfile, upsertUserProfile, getSalesUsers } from '@/lib/sales/db'
import { getServiceClient } from '@/lib/supabase'

// GET /api/sales/profile?userId=xxx  (admin can fetch any, rep only own)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, role } = session.user as { id: string; role: string }
  const targetId = req.nextUrl.searchParams.get('userId') ?? id

  if (role !== 'admin' && role !== 'manager' && targetId !== id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getServiceClient()
  const [profile, userRow] = await Promise.all([
    getUserProfile(targetId),
    db.from('sales_users')
      .select('id, username, email, name, role, is_active, created_at')
      .eq('id', targetId)
      .single(),
  ])

  return NextResponse.json({ profile, user: userRow.data })
}

// PATCH /api/sales/profile — update own profile (or any if admin)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, role } = session.user as { id: string; role: string }
  const body = await req.json()
  const targetId = body.userId ?? id

  if (role !== 'admin' && targetId !== id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Non-admins cannot change role or status
  const allowed = role === 'admin'
    ? ['job_title', 'phone', 'department', 'avatar_url', 'manager_id', 'bio', 'join_date', 'name', 'email', 'role', 'is_active']
    : ['job_title', 'phone', 'department', 'avatar_url', 'bio']

  const profileFields: Record<string, unknown> = {}
  const userFields: Record<string, unknown> = {}

  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (['name', 'email', 'role', 'is_active'].includes(key)) userFields[key] = body[key]
      else profileFields[key] = body[key]
    }
  }

  const db = getServiceClient()

  if (Object.keys(userFields).length > 0) {
    await db.from('sales_users').update(userFields).eq('id', targetId)
  }

  if (Object.keys(profileFields).length > 0) {
    await upsertUserProfile(targetId, profileFields)
  }

  return NextResponse.json({ ok: true })
}
