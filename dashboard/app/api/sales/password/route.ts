import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import {
  createPasswordResetToken,
  validateResetToken,
  consumeResetToken,
} from '@/lib/sales/db'
import bcrypt from 'bcryptjs'

// POST /api/sales/password
// action: 'change' | 'forgot' | 'reset'
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body
  const db = getServiceClient()

  // ── Change password (authenticated) ──────────────
  if (action === 'change') {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = session.user as { id: string }

    const { currentPassword, newPassword } = body
    if (!currentPassword || !newPassword)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    if (newPassword.length < 8)
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

    const { data: user } = await db
      .from('sales_users')
      .select('password_hash')
      .eq('id', id)
      .single()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

    const hash = await bcrypt.hash(newPassword, 10)
    await db.from('sales_users').update({ password_hash: hash }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // ── Forgot password — generate token ─────────────
  if (action === 'forgot') {
    const { email } = body
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const { data: user } = await db
      .from('sales_users')
      .select('id, name')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .maybeSingle()

    // Always return ok to prevent email enumeration
    if (!user) return NextResponse.json({ ok: true })

    const token = await createPasswordResetToken(user.id)
    // In production send email here. For now return token in response (dev mode)
    return NextResponse.json({ ok: true, resetToken: token })
  }

  // ── Reset password with token ─────────────────────
  if (action === 'reset') {
    const { token, newPassword } = body
    if (!token || !newPassword)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    if (newPassword.length < 8)
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

    const result = await validateResetToken(token)
    if (!result) return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })

    const hash = await bcrypt.hash(newPassword, 10)
    await db.from('sales_users').update({ password_hash: hash }).eq('id', result.userId)
    await consumeResetToken(token)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
