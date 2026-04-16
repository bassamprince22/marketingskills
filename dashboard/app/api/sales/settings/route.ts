import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { readSettings, writeSettings } from '@/lib/sales/autoAssign'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const db  = getServiceClient()
    const cfg = await readSettings(db)

    const { data: reps } = await db
      .from('sales_users')
      .select('id, name, role, avatar_url')
      .eq('is_active', true)
      .in('role', ['rep', 'manager'])
      .order('name')

    return NextResponse.json({ settings: cfg, reps: reps ?? [] })
  } catch (err) {
    console.error('Settings GET error:', err)
    return NextResponse.json({
      settings: { auto_assign: { enabled: false, rep_pool: [], last_assigned_rep_id: null } },
      reps: [],
    })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const db   = getServiceClient()
  const current = await readSettings(db)

  const updated = {
    ...current,
    auto_assign: {
      ...current.auto_assign,
      ...body.auto_assign,
    },
  }

  await writeSettings(db, updated)
  return NextResponse.json({ ok: true, settings: updated })
}
