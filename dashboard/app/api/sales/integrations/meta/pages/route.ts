import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

// GET — list connected pages & logs
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getServiceClient()
  const { data: integration } = await db
    .from('sales_integrations')
    .select('*')
    .eq('type', 'meta')
    .maybeSingle()

  const { data: logs } = await db
    .from('sales_integration_logs')
    .select('*')
    .eq('integration_type', 'meta')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ integration, logs: logs ?? [] })
}

// DELETE — disconnect Meta
export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getServiceClient()
  await db.from('sales_integrations').update({ is_active: false, config: {} }).eq('type', 'meta')
  return NextResponse.json({ ok: true })
}
