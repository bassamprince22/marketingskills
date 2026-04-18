import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

// POST: public endpoint — invitee submits profile details to create their account
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { username, name, password } = await req.json()
  if (!username || !name || !password)
    return NextResponse.json({ error: 'username, name and password are required' }, { status: 400 })
  if (password.length < 8)
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

  const db = getServiceClient()

  const { data: invite, error: inviteErr } = await db
    .from('sales_invites')
    .select('id, email, role, expires_at, accepted_at, revoked_at')
    .eq('token', params.token)
    .maybeSingle()

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 })
  if (!invite) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
  if (invite.accepted_at) return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
  if (invite.revoked_at) return NextResponse.json({ error: 'This invite was revoked' }, { status: 410 })
  if (new Date(invite.expires_at).getTime() < Date.now())
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })

  const cleanUsername = username.toLowerCase().trim()

  // Ensure the username is free
  const { data: existing } = await db
    .from('sales_users')
    .select('id')
    .eq('username', cleanUsername)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })

  const password_hash = await bcrypt.hash(password, 10)
  const { data: user, error: userErr } = await db
    .from('sales_users')
    .insert({
      username: cleanUsername,
      email: invite.email,
      name,
      role: invite.role,
      password_hash,
      is_active: true,
    })
    .select('id, username, email, name, role')
    .single()

  if (userErr) {
    if (userErr.code === '23505') return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    return NextResponse.json({ error: userErr.message }, { status: 500 })
  }

  await db
    .from('sales_invites')
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq('id', invite.id)

  return NextResponse.json({ user })
}
