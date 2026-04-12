import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import type { Permission } from '@/lib/sales/db'

// GET /api/sales/role-permissions?role=manager
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role: userRole } = session.user as { role: string }
  if (userRole !== 'admin' && userRole !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const role = req.nextUrl.searchParams.get('role')
  if (!role) return NextResponse.json({ error: 'role required' }, { status: 400 })

  const db = getServiceClient()
  const { data } = await db
    .from('sales_role_permissions')
    .select('module, can_view, can_create, can_edit, can_delete, can_manage')
    .eq('role', role)

  return NextResponse.json({ permissions: data ?? [] })
}

// PUT /api/sales/role-permissions — save permissions for a role
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role: userRole } = session.user as { role: string }
  if (userRole !== 'admin' && userRole !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { role, permissions } = await req.json() as { role: string; permissions: Permission[] }
  if (!role || !permissions) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = getServiceClient()
  const rows = permissions.map(p => ({ role, ...p }))
  const { error } = await db
    .from('sales_role_permissions')
    .upsert(rows, { onConflict: 'role,module' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// POST /api/sales/role-permissions — apply role permissions to all users of that role
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role: userRole } = session.user as { role: string }
  if (userRole !== 'admin' && userRole !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { role, permissions } = await req.json() as { role: string; permissions: Permission[] }
  if (!role || !permissions) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = getServiceClient()

  // Get all users with this role
  const { data: users } = await db
    .from('sales_users')
    .select('id')
    .eq('role', role)
    .eq('is_active', true)

  if (!users?.length) return NextResponse.json({ ok: true, applied: 0 })

  // Upsert permissions for each user
  const rows = users.flatMap(u =>
    permissions.map(p => ({ user_id: u.id, ...p }))
  )
  const { error } = await db
    .from('sales_permissions')
    .upsert(rows, { onConflict: 'user_id,module' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, applied: users.length })
}
