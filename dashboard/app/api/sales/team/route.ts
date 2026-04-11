import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

// GET /api/sales/team — admin only, returns all users with profiles
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getServiceClient()
  const { data: users } = await db
    .from('sales_users')
    .select('id, username, email, name, role, is_active, created_at')
    .order('name')

  const { data: profiles } = await db
    .from('sales_user_profiles')
    .select('*')

  const profileMap = Object.fromEntries((profiles ?? []).map((p: Record<string, unknown>) => [p.user_id, p]))

  const result = (users ?? []).map((u: Record<string, unknown>) => ({
    ...u,
    profile: profileMap[u.id as string] ?? null,
  }))

  return NextResponse.json({ users: result })
}

// POST /api/sales/team — admin creates user
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { username, email, name, role: userRole, password, job_title, department, phone } = body
  if (!username || !name || !userRole || !password)
    return NextResponse.json({ error: 'username, name, role, password required' }, { status: 400 })
  if (password.length < 8)
    return NextResponse.json({ error: 'Password must be 8+ characters' }, { status: 400 })

  const db = getServiceClient()
  const hash = await bcrypt.hash(password, 10)
  const { data: user, error } = await db
    .from('sales_users')
    .insert({ username: username.toLowerCase().trim(), email, name, role: userRole, password_hash: hash })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (job_title || department || phone) {
    await db.from('sales_user_profiles').insert({
      user_id: user.id, job_title, department, phone,
    })
  }

  return NextResponse.json({ ok: true, id: user.id })
}

// PATCH /api/sales/team — admin updates user
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, password, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = getServiceClient()
  const userUpdate: Record<string, unknown> = {}
  const profileUpdate: Record<string, unknown> = {}

  const userFields = ['name', 'email', 'role', 'is_active']
  const profileFields = ['job_title', 'phone', 'department', 'bio', 'manager_id', 'join_date', 'avatar_url']

  for (const key of userFields) { if (rest[key] !== undefined) userUpdate[key] = rest[key] }
  for (const key of profileFields) { if (rest[key] !== undefined) profileUpdate[key] = rest[key] }

  if (password) {
    if (password.length < 8) return NextResponse.json({ error: 'Password must be 8+ characters' }, { status: 400 })
    userUpdate.password_hash = await bcrypt.hash(password, 10)
  }

  if (Object.keys(userUpdate).length > 0)
    await db.from('sales_users').update(userUpdate).eq('id', id)

  if (Object.keys(profileUpdate).length > 0)
    await db.from('sales_user_profiles').upsert({ user_id: id, ...profileUpdate }, { onConflict: 'user_id' })

  return NextResponse.json({ ok: true })
}
