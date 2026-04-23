import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { sendInviteEmail } from '@/lib/sales/emailReporter'
import crypto from 'crypto'

// GET: list pending invites (admin only)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getServiceClient()
  const { data, error } = await db
    .from('sales_invites')
    .select('id, token, email, role, expires_at, accepted_at, revoked_at, created_at')
    .is('accepted_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invites: data })
}

// POST: create a new invite (admin only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: userId, role: callerRole } = session.user as { id: string; role: string }
  if (callerRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, role } = await req.json()
  if (!email || !role) return NextResponse.json({ error: 'email and role required' }, { status: 400 })
  if (!['manager', 'rep', 'admin'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const db = getServiceClient()

  // Reject if a user with this email already exists
  const { data: existing } = await db.from('sales_users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle()
  if (existing) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })

  const token = crypto.randomBytes(24).toString('hex')
  const { data, error } = await db
    .from('sales_invites')
    .insert({
      token,
      email: email.toLowerCase().trim(),
      role,
      invited_by: userId,
    })
    .select('id, token, email, role, expires_at, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const origin = req.nextUrl.origin
  const inviteUrl = `${origin}/sales/invite/${token}`

  // Send invite email (non-blocking — fails silently if RESEND_API_KEY not set)
  sendInviteEmail(data.email, data.role, inviteUrl, data.expires_at).catch(() => {})

  return NextResponse.json({ invite: data, inviteUrl }, { status: 201 })
}

// DELETE: revoke an invite by id (admin only)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = getServiceClient()
  const { error } = await db.from('sales_invites').update({ revoked_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
