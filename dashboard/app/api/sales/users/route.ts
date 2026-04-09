import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp   = req.nextUrl.searchParams
  const role = sp.get('role')
  const db   = getServiceClient()

  let q = db
    .from('sales_users')
    .select('id, username, email, name, role, avatar_url, is_active, created_at')
    .eq('is_active', true)
    .order('name')

  if (role === 'rep') q = q.in('role', ['rep', 'manager'])

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role: callerRole } = session.user as { role: string }
  if (callerRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { username, email, name, role, password } = await req.json()
    if (!username || !name || !role || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const password_hash = await bcrypt.hash(password, 10)
    const db = getServiceClient()
    const { data, error } = await db
      .from('sales_users')
      .insert({ username: username.toLowerCase().trim(), email, name, role, password_hash })
      .select('id, username, email, name, role, is_active, created_at')
      .single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
      throw error
    }
    return NextResponse.json({ user: data }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role: callerRole } = session.user as { role: string }
  if (callerRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { id, password, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const payload: Record<string, unknown> = { ...updates }
    if (password) payload.password_hash = await bcrypt.hash(password, 10)

    const db = getServiceClient()
    const { data, error } = await db
      .from('sales_users')
      .update(payload)
      .eq('id', id)
      .select('id, username, email, name, role, is_active')
      .single()
    if (error) throw error
    return NextResponse.json({ user: data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
