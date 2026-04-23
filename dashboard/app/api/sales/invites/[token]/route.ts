import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

// GET: public endpoint — validate an invite token and return email + role
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const db = getServiceClient()
  const { data, error } = await db
    .from('sales_invites')
    .select('email, role, expires_at, accepted_at, revoked_at')
    .eq('token', params.token)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
  if (data.accepted_at) return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
  if (data.revoked_at) return NextResponse.json({ error: 'This invite was revoked' }, { status: 410 })
  if (new Date(data.expires_at).getTime() < Date.now())
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })

  return NextResponse.json({ email: data.email, role: data.role })
}
